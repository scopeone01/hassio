import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcrypt';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name',
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'last_name',
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash',
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'phone_number',
  },
  roleName: {
    type: DataTypes.STRING(50),
    defaultValue: 'USER',
    field: 'role_name',
  },
  isTechnician: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_technician',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login',
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
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      // Hash password if it's a plain text password
      // Check for both $2a$ and $2b$ (bcrypt hash formats)
      if (user.passwordHash && !user.passwordHash.startsWith('$2a$') && !user.passwordHash.startsWith('$2b$')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    },
    beforeUpdate: async (user) => {
      // Hash password if it's being updated and is plain text
      // Check for both $2a$ and $2b$ (bcrypt hash formats)
      if (user.changed('passwordHash') && user.passwordHash && !user.passwordHash.startsWith('$2a$') && !user.passwordHash.startsWith('$2b$')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
      user.updatedAt = new Date();
    },
  },
});

// Instance method to check password
User.prototype.checkPassword = async function(password) {
  try {
    if (!this.passwordHash || !password) {
      return false;
    }
    const result = await bcrypt.compare(password, this.passwordHash);
    return result;
  } catch (error) {
    console.error('Password check error:', error);
    return false;
  }
};

// Instance method to get full name
User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

export default User;

