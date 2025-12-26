//
//  resetPassword.js
//  FacilityMaster API
//
//  Setzt Passwort für einen User zurück
//

import sequelize from './database.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

async function resetPassword() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const email = process.argv[2] || 'admin@facilitymaster.de';
    const newPassword = process.argv[3] || 'admin123';

    console.log(`\n🔐 Resetting password for: ${email}`);
    console.log(`   New password: ${newPassword}\n`);

    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log('\n💡 Creating new user instead...\n');
      
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const newUser = await User.create({
        firstName: email.includes('admin') ? 'Admin' : 'User',
        lastName: 'User',
        email: email,
        passwordHash: passwordHash,
        roleName: email.includes('admin') ? 'ADMIN' : 'USER',
        isTechnician: email.includes('techniker') || email.includes('tech'),
        isActive: true,
      });

      console.log(`✅ Created new user: ${email}`);
      console.log(`   Password: ${newPassword}`);
      await sequelize.close();
      process.exit(0);
    }

    // Reset password - use direct update to avoid hook issues
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.update(
      { passwordHash: passwordHash },
      { where: { id: user.id } }
    );

    console.log(`✅ Password reset successful for: ${email}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   Role: ${user.roleName}`);
    console.log(`   Active: ${user.isActive}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

resetPassword();

