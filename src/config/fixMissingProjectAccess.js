import sequelize from './database.js';
import Project from '../models/Project.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import User from '../models/User.js';
import '../models/associations.js';

async function fixMissingProjectAccess() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get all projects
    const allProjects = await Project.findAll({
      attributes: ['id', 'name', 'projectNumber', 'createdAt'],
    });
    console.log(`📁 Found ${allProjects.length} projects in database\n`);

    // Get all UserProjectAccess entries
    const allAccess = await UserProjectAccess.findAll({
      attributes: ['projectId'],
    });
    const projectsWithAccess = new Set(allAccess.map(a => a.projectId));
    
    // Find projects without any access entries
    const projectsWithoutAccess = allProjects.filter(p => !projectsWithAccess.has(p.id));
    
    if (projectsWithoutAccess.length === 0) {
      console.log('✅ All projects have at least one UserProjectAccess entry.\n');
      return;
    }

    console.log(`⚠️  Found ${projectsWithoutAccess.length} projects without UserProjectAccess entries:\n`);
    projectsWithoutAccess.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });
    console.log('');

    // Get all admin users
    const adminUsers = await User.findAll({
      where: { roleName: 'ADMIN' },
      attributes: ['id', 'email', 'firstName', 'lastName'],
    });

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found. Cannot automatically assign access.\n');
      console.log('💡 Please create an admin user first or manually assign access to projects.\n');
      return;
    }

    console.log(`👥 Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach(u => {
      console.log(`   - ${u.firstName} ${u.lastName} (${u.email})`);
    });
    console.log('');

    // Use the first admin user as the default grantor
    const defaultAdmin = adminUsers[0];
    console.log(`🔧 Assigning ADMIN access to projects using: ${defaultAdmin.email}\n`);

    let createdCount = 0;
    for (const project of projectsWithoutAccess) {
      // Check if access already exists (race condition protection)
      const existingAccess = await UserProjectAccess.findOne({
        where: { projectId: project.id },
      });

      if (existingAccess) {
        console.log(`   ⏭️  Skipping ${project.name} - access already exists`);
        continue;
      }

      // Create ADMIN access for the default admin
      await UserProjectAccess.create({
        userId: defaultAdmin.id,
        projectId: project.id,
        accessLevel: 'ADMIN',
        userType: 'admin',
        canCreateTickets: true,
        canEditTickets: true,
        canAssignTickets: true,
        canDeleteTickets: true,
        canApproveWorkflow: true,
        canViewAllTickets: true,
        receiveNotifications: true,
        notificationChannels: ['push', 'email'],
        grantedBy: defaultAdmin.id,
        grantedAt: new Date(),
      });

      console.log(`   ✅ Created ADMIN access for ${project.name}`);
      createdCount++;
    }

    console.log(`\n✅ Created ${createdCount} UserProjectAccess entries\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

fixMissingProjectAccess();


