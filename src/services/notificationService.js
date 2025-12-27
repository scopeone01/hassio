import Notification from '../models/Notification.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import { Op } from 'sequelize';

// Notification Event Types
export const NOTIFICATION_EVENTS = {
    // Ticket Events
    TICKET_CREATED: 'ticket:created',
    TICKET_ASSIGNED: 'ticket:assigned',
    TICKET_STATUS_CHANGED: 'ticket:status_changed',
    TICKET_PRIORITY_CHANGED: 'ticket:priority_changed',
    TICKET_CLOSED: 'ticket:closed',
    
    // Comment Events
    COMMENT_ADDED: 'comment:added',
    COMMENT_MENTIONED: 'comment:mentioned',
    
    // Assignment Events
    USER_MENTIONED: 'user:mentioned',
    WATCHER_ADDED: 'watcher:added',
    
    // SLA Events
    SLA_WARNING_50: 'sla:warning_50',
    SLA_WARNING_80: 'sla:warning_80',
    SLA_EXCEEDED: 'sla:exceeded',
    
    // Workflow Events
    APPROVAL_REQUIRED: 'workflow:approval_required',
    APPROVAL_GRANTED: 'workflow:approval_granted',
    APPROVAL_REJECTED: 'workflow:approval_rejected',
    
    // Escalation
    TICKET_ESCALATED: 'ticket:escalated'
};

// Notification Templates
const notificationTemplates = {
    [NOTIFICATION_EVENTS.TICKET_ASSIGNED]: {
        title: 'Ticket zugewiesen',
        body: '{{ ticket.ticketNumber }}: {{ ticket.title }} wurde Ihnen zugewiesen',
        priority: 'normal'
    },
    [NOTIFICATION_EVENTS.COMMENT_MENTIONED]: {
        title: 'Sie wurden erwähnt',
        body: '{{ actor.name }} hat Sie in Ticket {{ ticket.ticketNumber }} erwähnt',
        priority: 'normal'
    },
    [NOTIFICATION_EVENTS.SLA_WARNING_80]: {
        title: 'SLA-Warnung',
        body: 'Ticket {{ ticket.ticketNumber }} erreicht 80% der SLA-Zeit',
        priority: 'high'
    },
    [NOTIFICATION_EVENTS.TICKET_ESCALATED]: {
        title: 'Ticket eskaliert',
        body: 'Ticket {{ ticket.ticketNumber }} wurde eskaliert',
        priority: 'urgent'
    }
};

class NotificationService {
    // Send notification to specific user
    async sendNotification({ userId, projectId, type, title, body, data, channels, ticketId, priority }) {
        try {
            const notification = await Notification.create({
                userId,
                projectId,
                type,
                title,
                body,
                data,
                channels: channels || ['push'],
                ticketId,
                priority: priority || 'normal',
                sentAt: new Date()
            });
            
            // Send via channels
            await this.sendViaChannels(notification, channels || ['push']);
            
            return notification;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }
    
    // Send to multiple users
    async sendBulkNotifications(users, { projectId, type, title, body, data, ticketId, priority }) {
        const notifications = [];
        
        for (const user of users) {
            try {
                const notification = await this.sendNotification({
                    userId: user.userId,
                    projectId,
                    type,
                    title,
                    body,
                    data,
                    channels: user.notificationChannels || ['push'],
                    ticketId,
                    priority
                });
                notifications.push(notification);
            } catch (error) {
                console.error(`Failed to send notification to user ${user.userId}:`, error);
            }
        }
        
        return notifications;
    }
    
    // Send via specific channels
    async sendViaChannels(notification, channels) {
        for (const channel of channels) {
            try {
                switch (channel) {
                    case 'push':
                        await this.sendPushNotification(notification);
                        break;
                    case 'email':
                        await this.sendEmailNotification(notification);
                        break;
                    case 'sms':
                        await this.sendSMSNotification(notification);
                        break;
                }
            } catch (error) {
                console.error(`Failed to send ${channel} notification:`, error);
            }
        }
    }
    
    // Push notification (via Firebase)
    async sendPushNotification(notification) {
        console.log(`📱 Push notification sent: ${notification.title}`);
        // Implementation with Firebase Cloud Messaging
        // const message = {
        //     notification: {
        //         title: notification.title,
        //         body: notification.body
        //     },
        //     data: notification.data,
        //     token: userDeviceToken
        // };
        // await admin.messaging().send(message);
    }
    
    // Email notification
    async sendEmailNotification(notification) {
        console.log(`📧 Email notification sent: ${notification.title}`);
        // Implementation with NodeMailer
        // const transporter = nodemailer.createTransporter({...});
        // await transporter.sendMail({
        //     from: process.env.SMTP_FROM,
        //     to: userEmail,
        //     subject: notification.title,
        //     html: renderTemplate(notification)
        // });
    }
    
    // SMS notification
    async sendSMSNotification(notification) {
        console.log(`📱 SMS notification sent: ${notification.title}`);
        // Implementation with Twilio
        // const client = twilio(accountSid, authToken);
        // await client.messages.create({
        //     body: notification.body,
        //     from: process.env.TWILIO_PHONE_NUMBER,
        //     to: userPhoneNumber
        // });
    }
    
    // Get template
    getTemplate(eventType) {
        return notificationTemplates[eventType] || {
            title: 'Notification',
            body: 'You have a new notification',
            priority: 'normal'
        };
    }
    
    // Render template with data
    renderTemplate(template, data) {
        let title = template.title;
        let body = template.body;
        
        // Simple template replacement
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (typeof value === 'object') {
                Object.keys(value).forEach(subKey => {
                    title = title.replace(`{{ ${key}.${subKey} }}`, value[subKey]);
                    body = body.replace(`{{ ${key}.${subKey} }}`, value[subKey]);
                });
            } else {
                title = title.replace(`{{ ${key} }}`, value);
                body = body.replace(`{{ ${key} }}`, value);
            }
        });
        
        return { title, body, priority: template.priority };
    }
    
    // Get user's unread count
    async getUnreadCount(userId, projectId = null) {
        const where = {
            userId,
            isRead: false
        };
        
        if (projectId) {
            where.projectId = projectId;
        }
        
        return await Notification.count({ where });
    }
    
    // Mark as read
    async markAsRead(notificationId, userId) {
        const notification = await Notification.findOne({
            where: { id: notificationId, userId }
        });
        
        if (notification) {
            await notification.markAsRead();
            return notification;
        }
        
        throw new Error('Notification not found');
    }
    
    // Mark all as read
    async markAllAsRead(userId, projectId = null) {
        return await Notification.markAllAsRead(userId, projectId);
    }
    
    // Delete notification
    async deleteNotification(notificationId, userId) {
        const notification = await Notification.findOne({
            where: { id: notificationId, userId }
        });
        
        if (notification) {
            await notification.destroy();
            return true;
        }
        
        return false;
    }
}

export default new NotificationService();








