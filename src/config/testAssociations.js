//
//  testAssociations.js
//  Test Model-Assoziationen
//

import sequelize from './database.js';
import '../models/associations.js';
import UserProjectAccess from '../models/UserProjectAccess.js';
import ProjectRole from '../models/ProjectRole.js';

async function testAssociations() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Test if association exists
    console.log('🔍 Testing associations...\n');
    
    // Check if UserProjectAccess has role association
    const associations = UserProjectAccess.associations;
    console.log('UserProjectAccess associations:');
    Object.keys(associations).forEach(key => {
      console.log(`  - ${key}: ${associations[key].associationType}`);
    });
    
    console.log('\n✅ Associations loaded!');
    
    // Try a simple query
    const testAccess = await UserProjectAccess.findOne({
      include: [{
        model: ProjectRole,
        as: 'role',
        required: false
      }],
      limit: 1
    });
    
    if (testAccess) {
      console.log('✅ Test query successful!');
      console.log(`   Found access with role: ${testAccess.role ? testAccess.role.name : 'none'}`);
    } else {
      console.log('ℹ️  No UserProjectAccess found (this is OK if DB is empty)');
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

testAssociations();

