import sequelize from './database.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import '../models/associations.js';

async function fixDoubleHashedPasswords() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const users = await User.findAll();
    console.log(`\n🔍 Checking ${users.length} users for double-hashed passwords...\n`);

    let fixedCount = 0;

    for (const user of users) {
      // Test if password is double-hashed by trying to verify a test password
      // If the hash is double-hashed, it won't match any password
      // We'll check if the hash looks like it might be double-hashed
      // (bcrypt hashes are 60 characters, double-hashed would be longer or have unusual structure)
      
      const hash = user.passwordHash;
      
      // A normal bcrypt hash is 60 characters and starts with $2a$ or $2b$
      // If it's longer or has a different structure, it might be double-hashed
      if (hash && hash.length > 60) {
        console.log(`⚠️  User ${user.email} has a suspiciously long password hash (${hash.length} chars)`);
        console.log(`   This might be a double-hashed password.`);
        console.log(`   To fix: Use reset:password script to set a new password.`);
        console.log(`   Command: npm run reset:password ${user.email} <new-password>\n`);
        fixedCount++;
      } else if (hash && (!hash.startsWith('$2a$') && !hash.startsWith('$2b$'))) {
        console.log(`⚠️  User ${user.email} has an invalid password hash format`);
        console.log(`   To fix: Use reset:password script to set a new password.`);
        console.log(`   Command: npm run reset:password ${user.email} <new-password>\n`);
        fixedCount++;
      }
    }

    if (fixedCount === 0) {
      console.log('✅ All passwords appear to be correctly hashed.');
    } else {
      console.log(`\n⚠️  Found ${fixedCount} users with potentially problematic password hashes.`);
      console.log('   Use the reset:password script to fix them individually.');
    }

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

fixDoubleHashedPasswords();








