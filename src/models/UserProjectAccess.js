import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserProjectAccess = sequelize.define('user_project_access', {
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
        allowNull: false,
        field: 'project_id'
    },
    roleId: {
        type: DataTypes.UUID,
        field: 'role_id'
    },
    accessLevel: {
        type: DataTypes.STRING(50),
        defaultValue: 'READ',
        field: 'access_level'
    },
    userType: {
        type: DataTypes.STRING(50),
        defaultValue: 'guest',
        field: 'user_type'
    },
    canCreateTickets: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'can_create_tickets'
    },
    canEditTickets: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'can_edit_tickets'
    },
    canAssignTickets: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_assign_tickets'
    },
    canDeleteTickets: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_delete_tickets'
    },
    canApproveWorkflow: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_approve_workflow'
    },
    canViewAllTickets: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_view_all_tickets'
    },
    receiveNotifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'receive_notifications'
    },
    notificationChannels: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'notification_channels'
    },
    grantedAt: {
        type: DataTypes.DATE,
        field: 'granted_at'
    },
    grantedBy: {
        type: DataTypes.UUID,
        field: 'granted_by'
    }
}, {
    tableName: 'user_project_access',
    timestamps: false,
    underscored: true,
    hooks: {
        beforeCreate: (access) => {
            if (!access.notificationChannels) {
                access.notificationChannels = ['push'];
            }
        },
    },
});

// Instance methods
UserProjectAccess.prototype.hasPermission = function (permission) {
    if (this.accessLevel === 'ADMIN') return true;
    
    const permissionMap = {
        createTickets: this.canCreateTickets,
        editTickets: this.canEditTickets,
        assignTickets: this.canAssignTickets,
        deleteTickets: this.canDeleteTickets,
        approveWorkflow: this.canApproveWorkflow,
        viewAllTickets: this.canViewAllTickets
    };
    
    return permissionMap[permission] || false;
};

export default UserProjectAccess;

