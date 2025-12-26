import Notification from '../models/Notification.js';
import notificationService from '../services/notificationService.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import { Op } from 'sequelize';

// GET /api/v1/notifications
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { projectId, isRead, type, limit = 50, offset = 0 } = req.query;
        
        const where = { userId };
        
        if (projectId) {
            where.projectId = projectId;
        }
        
        if (isRead !== undefined) {
            where.isRead = isRead === 'true';
        }
        
        if (type) {
            where.type = type;
        }
        
        const notifications = await Notification.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        const total = await Notification.count({ where });
        
        res.json({
            success: true,
            data: notifications,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
};

// GET /api/v1/notifications/unread/count
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.query;
        
        const count = await notificationService.getUnreadCount(userId, projectId);
        
        res.json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch unread count'
        });
    }
};

// GET /api/v1/notifications/:id
export const getNotificationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const notification = await Notification.findOne({
            where: { id, userId }
        });
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }
        
        res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Error fetching notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification'
        });
    }
};

// PUT /api/v1/notifications/:id/read
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const notification = await notificationService.markAsRead(id, userId);
        
        res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
};

// PUT /api/v1/notifications/read/all
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.body;
        
        const count = await notificationService.markAllAsRead(userId, projectId);
        
        res.json({
            success: true,
            message: `${count} notifications marked as read`
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all notifications as read'
        });
    }
};

// DELETE /api/v1/notifications/:id
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const deleted = await notificationService.deleteNotification(id, userId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification'
        });
    }
};

// GET /api/v1/notifications/preferences
export const getPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.query;
        
        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }
        
        const access = await UserProjectAccess.findOne({
            where: { userId, projectId }
        });
        
        if (!access) {
            return res.status(404).json({
                success: false,
                error: 'Project access not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                receiveNotifications: access.receiveNotifications,
                notificationChannels: access.notificationChannels
            }
        });
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch preferences'
        });
    }
};

// PUT /api/v1/notifications/preferences
export const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { projectId, receiveNotifications, notificationChannels } = req.body;
        
        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }
        
        const access = await UserProjectAccess.findOne({
            where: { userId, projectId }
        });
        
        if (!access) {
            return res.status(404).json({
                success: false,
                error: 'Project access not found'
            });
        }
        
        if (receiveNotifications !== undefined) {
            access.receiveNotifications = receiveNotifications;
        }
        
        if (notificationChannels) {
            access.notificationChannels = notificationChannels;
        }
        
        await access.save();
        
        res.json({
            success: true,
            data: {
                receiveNotifications: access.receiveNotifications,
                notificationChannels: access.notificationChannels
            }
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
};








