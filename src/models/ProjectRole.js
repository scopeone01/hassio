import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ProjectRole = sequelize.define('project_roles', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'project_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    color: {
        type: DataTypes.STRING(7),
        defaultValue: '#007AFF'
    },
    icon: {
        type: DataTypes.STRING(100),
        defaultValue: 'person.fill'
    },
    permissions: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    specialization: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    skillLevel: {
        type: DataTypes.STRING(50),
        defaultValue: 'Mid-Level',
        field: 'skill_level'
    },
    workingHours: {
        type: DataTypes.JSON,
        field: 'working_hours'
    },
    maxConcurrentTickets: {
        type: DataTypes.INTEGER,
        field: 'max_concurrent_tickets'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
    }
}, {
    tableName: 'project_roles',
    timestamps: true,
    underscored: true,
    hooks: {
        beforeCreate: (role) => {
            if (!role.permissions) {
                role.permissions = {
                    canCreateTickets: true,
                    canEditTickets: true,
                    canAssignTickets: false,
                    canDeleteTickets: false,
                    canViewAllTickets: false,
                    canApproveWorkflows: false,
                    canManageTemplates: false,
                    canExportData: false,
                    canManageUsers: false
                };
            }
            if (!role.specialization) {
                role.specialization = [];
            }
        },
    },
});

// Instance methods
ProjectRole.prototype.toJSON = function () {
    const values = { ...this.get() };
    return values;
};

export default ProjectRole;








