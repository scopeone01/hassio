import sequelize from './database.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import '../models/associations.js';

async function fixOrphanedProjectAccess() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get all UserProjectAccess entries
    const allAccess = await UserProjectAccess.findAll();
    console.log(`📊 Found ${allAccess.length} UserProjectAccess entries\n`);

    // Get all existing projects
    const allProjects = await Project.findAll({
      attributes: ['id', 'name', 'projectNumber'],
    });
    const projectIds = new Set(allProjects.map(p => p.id));
    console.log(`📁 Found ${allProjects.length} projects in database:`);
    allProjects.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });
    console.log('');

    // Find orphaned access entries (referencing non-existent projects)
    const orphanedAccess = allAccess.filter(access => !projectIds.has(access.projectId));
    
    console.log(`⚠️  Found ${orphanedAccess.length} orphaned UserProjectAccess entries:\n`);
    
    if (orphanedAccess.length > 0) {
      // Group by projectId to see which projects are missing
      const missingProjectIds = new Set(orphanedAccess.map(a => a.projectId));
      console.log(`❌ Missing projects (${missingProjectIds.size}):`);
      missingProjectIds.forEach(projectId => {
        const accessCount = orphanedAccess.filter(a => a.projectId === projectId).length;
        console.log(`   - ${projectId} (referenced by ${accessCount} access entries)`);
      });
      console.log('');

      // Show which users are affected
      const affectedUserIds = new Set(orphanedAccess.map(a => a.userId));
      const affectedUsers = await User.findAll({
        where: { id: Array.from(affectedUserIds) },
        attributes: ['id', 'email', 'firstName', 'lastName'],
      });
      
      console.log(`👥 Affected users (${affectedUsers.length}):`);
      affectedUsers.forEach(user => {
        const userOrphanedAccess = orphanedAccess.filter(a => a.userId === user.id);
        console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - ${userOrphanedAccess.length} orphaned access entries`);
      });
      console.log('');

      // Ask what to do
      console.log('🔧 Options:');
      console.log('   1. Delete orphaned UserProjectAccess entries');
      console.log('   2. Create missing projects (with default data)');
      console.log('   3. Show details only (do nothing)');
      console.log('');
      console.log('⚠️  To fix this, run one of these commands:');
      console.log('   npm run fix:orphaned --delete    (Delete orphaned entries)');
      console.log('   npm run fix:orphaned --create    (Create missing projects)');
      console.log('');
    } else {
      console.log('✅ No orphaned entries found. All UserProjectAccess entries reference existing projects.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete');
const shouldCreate = args.includes('--create');

if (shouldDelete || shouldCreate) {
  fixOrphanedProjectAccess().then(async () => {
    if (shouldDelete) {
      console.log('\n🗑️  Deleting orphaned entries...');
      // Get orphaned entries again
      const allAccess = await UserProjectAccess.findAll();
      const allProjects = await Project.findAll({ attributes: ['id'] });
      const projectIds = new Set(allProjects.map(p => p.id));
      const orphanedAccess = allAccess.filter(access => !projectIds.has(access.projectId));
      
      if (orphanedAccess.length > 0) {
        const orphanedIds = orphanedAccess.map(a => a.id);
        await UserProjectAccess.destroy({ where: { id: orphanedIds } });
        console.log(`✅ Deleted ${orphanedIds.length} orphaned UserProjectAccess entries\n`);
      }
    }
    
    if (shouldCreate) {
      console.log('\n➕ Creating missing projects...');
      // Get orphaned entries
      const allAccess = await UserProjectAccess.findAll();
      const allProjects = await Project.findAll({ attributes: ['id'] });
      const projectIds = new Set(allProjects.map(p => p.id));
      const orphanedAccess = allAccess.filter(access => !projectIds.has(access.projectId));
      const missingProjectIds = new Set(orphanedAccess.map(a => a.projectId));
      
      if (missingProjectIds.size > 0) {
        for (const projectId of missingProjectIds) {
          // Create a default project
          await Project.create({
            id: projectId,
            name: `Projekt ${projectId.substring(0, 8)}`,
            projectNumber: `PROJ-${projectId.substring(0, 8).toUpperCase()}`,
            address: 'Adresse unbekannt',
            city: 'Stadt unbekannt',
            postalCode: '00000',
            country: 'Deutschland',
            isActive: true,
          });
          console.log(`✅ Created project: ${projectId.substring(0, 8)}`);
        }
        console.log(`\n✅ Created ${missingProjectIds.size} missing projects\n`);
      }
    }
    
    await sequelize.close();
  });
} else {
  fixOrphanedProjectAccess();
}








