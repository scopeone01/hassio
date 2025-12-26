//
//  associations.js
//  FacilityMaster API
//
//  Definiert alle Sequelize Model-Assoziationen
//

import User from './User.js';
import Project from './Project.js';
import UserProjectAccess from './UserProjectAccess.js';
import ProjectRole from './ProjectRole.js';
import Ticket from './Ticket.js';

// UserProjectAccess Associations
UserProjectAccess.belongsTo(User, {
  foreignKey: 'userId',
  targetKey: 'id',
  as: 'user'
});

UserProjectAccess.belongsTo(Project, {
  foreignKey: 'projectId',
  targetKey: 'id',
  as: 'project'
});

// CRITICAL: Define the belongsTo association with ProjectRole
UserProjectAccess.belongsTo(ProjectRole, {
  foreignKey: 'roleId',
  targetKey: 'id',
  as: 'role'
});

// ProjectRole Associations
ProjectRole.belongsTo(Project, {
  foreignKey: 'projectId',
  targetKey: 'id',
  as: 'project'
});

ProjectRole.hasMany(UserProjectAccess, {
  foreignKey: 'roleId',
  sourceKey: 'id',
  as: 'users'
});

// Project Associations
Project.hasMany(UserProjectAccess, {
  foreignKey: 'projectId',
  sourceKey: 'id',
  as: 'userAccess'
});

Project.hasMany(ProjectRole, {
  foreignKey: 'projectId',
  sourceKey: 'id',
  as: 'roles'
});

Project.hasMany(Ticket, {
  foreignKey: 'projectId',
  sourceKey: 'id',
  as: 'tickets'
});

// User Associations
User.hasMany(UserProjectAccess, {
  foreignKey: 'userId',
  sourceKey: 'id',
  as: 'projectAccess'
});

// Ticket Associations
Ticket.belongsTo(Project, {
  foreignKey: 'projectId',
  targetKey: 'id',
  as: 'project'
});

// Verify associations are registered
console.log('✅ Model associations registered');
console.log('   UserProjectAccess.associations:', Object.keys(UserProjectAccess.associations || {}));
console.log('   ProjectRole.associations:', Object.keys(ProjectRole.associations || {}));

export default {
  User,
  Project,
  UserProjectAccess,
  ProjectRole,
  Ticket
};

