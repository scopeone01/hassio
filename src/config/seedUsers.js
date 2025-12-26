//
//  seedUsers.js
//  FacilityMaster API
//
//  Erstellt initiale Demo-User für Entwicklung
//

import sequelize from './database.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import bcrypt from 'bcrypt';

async function seedUsers() {
  try {
    console.log('🌱 Seeding initial users...');

    // Prüfe ob bereits User existieren
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      console.log('ℹ️  Users already exist, skipping seed');
      return;
    }

    // Erstelle Demo-User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const techPassword = await bcrypt.hash('tech123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@facilitymaster.de',
      passwordHash: adminPassword,
      roleName: 'ADMIN',
      isTechnician: false,
      isActive: true,
    });

    const technician = await User.create({
      firstName: 'Max',
      lastName: 'Techniker',
      email: 'techniker@facilitymaster.de',
      passwordHash: techPassword,
      roleName: 'TECHNICIAN',
      isTechnician: true,
      isActive: true,
    });

    const user = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'user@facilitymaster.de',
      passwordHash: userPassword,
      roleName: 'USER',
      isTechnician: false,
      isActive: true,
    });

    console.log('✅ Created users:');
    console.log(`   - Admin: admin@facilitymaster.de / admin123`);
    console.log(`   - Techniker: techniker@facilitymaster.de / tech123`);
    console.log(`   - User: user@facilitymaster.de / user123`);

    // Erstelle ein Demo-Projekt falls keines existiert
    const existingProjects = await Project.count();
    if (existingProjects === 0) {
      const demoProject = await Project.create({
        name: 'Demo Projekt',
        projectNumber: 'DEMO-001',
        address: 'Musterstraße 1',
        city: 'München',
        postalCode: '80331',
        country: 'Deutschland',
        isActive: true,
      });

      console.log('✅ Created demo project:', demoProject.name);

      // Weise alle User dem Demo-Projekt zu
      await UserProjectAccess.create({
        userId: admin.id,
        projectId: demoProject.id,
        accessLevel: 'ADMIN',
        userType: 'Admin',
        canCreateTickets: true,
        canEditTickets: true,
        canAssignTickets: true,
        canDeleteTickets: true,
        canViewAllTickets: true,
        canApproveWorkflow: true,
        receiveNotifications: true,
        notificationChannels: ['push'],
        grantedAt: new Date(),
      });

      await UserProjectAccess.create({
        userId: technician.id,
        projectId: demoProject.id,
        accessLevel: 'WRITE',
        userType: 'Technician',
        canCreateTickets: true,
        canEditTickets: true,
        canAssignTickets: false,
        canDeleteTickets: false,
        canViewAllTickets: false,
        canApproveWorkflow: false,
        receiveNotifications: true,
        notificationChannels: ['push'],
        grantedAt: new Date(),
      });

      await UserProjectAccess.create({
        userId: user.id,
        projectId: demoProject.id,
        accessLevel: 'READ',
        userType: 'Contact',
        canCreateTickets: true,
        canEditTickets: false,
        canAssignTickets: false,
        canDeleteTickets: false,
        canViewAllTickets: false,
        canApproveWorkflow: false,
        receiveNotifications: true,
        notificationChannels: ['push'],
        grantedAt: new Date(),
      });

      console.log('✅ Assigned all users to demo project');
    }

    console.log('✅ User seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

// Run if called directly
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    await seedUsers();
    await sequelize.close();
    console.log('✅ Seed completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
})();

export default seedUsers;

