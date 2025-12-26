import express from 'express';
import * as notificationsController from '../controllers/notificationsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user notifications
router.get('/', notificationsController.getNotifications);

// Get unread count
router.get('/unread/count', notificationsController.getUnreadCount);

// Get notification by ID
router.get('/:id', notificationsController.getNotificationById);

// Mark as read
router.put('/:id/read', notificationsController.markAsRead);

// Mark all as read
router.put('/read/all', notificationsController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationsController.deleteNotification);

// User notification preferences
router.get('/preferences', notificationsController.getPreferences);
router.put('/preferences', notificationsController.updatePreferences);

export default router;








