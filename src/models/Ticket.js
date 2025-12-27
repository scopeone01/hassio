import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'project_id',
  },
  ticketNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'ticket_number',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    field: 'description',
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'New',
  },
  priority: {
    type: DataTypes.STRING(50),
    defaultValue: 'Normal',
  },
  category: {
    type: DataTypes.STRING(100),
  },
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_to_id',
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_id',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  tableName: 'tickets',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeUpdate: (ticket) => {
      ticket.updatedAt = new Date();
    },
  },
});

export default Ticket;

