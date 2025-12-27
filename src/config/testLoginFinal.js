//
//  testLoginFinal.js
//  Finaler Login-Test
//

import sequelize from './database.js';
import User from '../models/User.js';

async function testLogin() {
  try {
    await sequelize.authenticate();
    
    const email = 'admin@facilitymaster.de';
    const password = 'admin123';

    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found');
    console.log(`   Hash: ${user.passwordHash.substring(0, 30)}...`);
    
    const isValid = await user.checkPassword(password);
    console.log(`   Password '${password}' valid: ${isValid}`);
    
    if (isValid) {
      console.log('\n✅ Login sollte jetzt funktionieren!');
    } else {
      console.log('\n❌ Passwort stimmt immer noch nicht!');
    }

    await sequelize.close();
    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

testLogin();








