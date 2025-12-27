import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('notifications', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    projectId: {
        type: DataTypes.UUID,
        field: 'project_id'
    },
    type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    body: {
        type: DataTypes.TEXT
    },
    data: {
        type: DataTypes.JSON
    },
    channels: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_read'
    },
    readAt: {
        type: DataTypes.DATE,
        field: 'read_at'
    },
    sentAt: {
        type: DataTypes.DATE,
        field: 'sent_at'
    },
    createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
    },
    ticketId: {
        type: DataTypes.UUID,
        field: 'ticket_id'
    },
    assetId: {
        type: DataTypes.UUID,
        field: 'asset_id'
    },
    taskId: {
        type: DataTypes.UUID,
        field: 'task_id'
    },
    priority: {
        type: DataTypes.STRING(50),
        defaultValue: 'normal'
    }
}, {
    tableName: 'notifications',
    timestamps: false,
    underscored: true,
    hooks: {
        beforeCreate: (notification) => {
            if (!notification.channels) {
                notification.channels = ['push'];
            }
        },
    },
});

// Instance methods
Notification.prototype.markAsRead = async function () {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
};

// Static methods
Notification.unreadCount = async function (userId) {
    return await this.count({
        where: {
            userId,
            isRead: false
        }
    });
};

Notification.markAllAsRead = async function (userId, projectId = null) {
    const where = { userId, isRead: false };
    if (projectId) {
        where.projectId = projectId;
    }
    
    return await this.update(
        { isRead: true, readAt: new Date() },
        { where }
    );
};

export default Notification;








