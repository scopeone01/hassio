import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  projectNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  postalCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'Deutschland',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  notificationSettings: {
    type: DataTypes.JSON,
    defaultValue: () => JSON.stringify({
      notifyOnNewTicket: true,
      notifyOnAssignment: true,
      notifyOnStatusChange: true,
      notifyOnComment: true,
      notifyOnSlaWarning: true,
      emailDigestFrequency: 'Daily',
    }),
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'projects',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeUpdate: (project) => {
      project.updatedAt = new Date();
    },
  },
});

export default Project;

