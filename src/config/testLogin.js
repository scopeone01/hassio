//
//  testLogin.js
//  Test Login für Debugging
//

import sequelize from './database.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

async function testLogin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    const email = 'admin@facilitymaster.de';
    const password = 'admin123';

    console.log(`🔍 Testing login for: ${email}`);
    console.log(`   Password: ${password}\n`);

    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.roleName}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Password Hash: ${user.passwordHash.substring(0, 30)}...`);
    console.log(`   Hash starts with $2a$: ${user.passwordHash.startsWith('$2a$')}`);
    console.log('');

    // Test password check
    console.log('🔐 Testing password validation...');
    const isValid = await user.checkPassword(password);
    console.log(`   Password valid: ${isValid}`);
    console.log('');

    if (!isValid) {
      console.log('❌ Password validation failed!');
      console.log('   Resetting password...\n');
      
      const newHash = await bcrypt.hash(password, 10);
      user.passwordHash = newHash;
      await user.save();
      
      console.log('✅ Password reset! Testing again...');
      const isValidAfterReset = await user.checkPassword(password);
      console.log(`   Password valid after reset: ${isValidAfterReset}`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

testLogin();








