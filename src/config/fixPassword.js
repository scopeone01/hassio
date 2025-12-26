//
//  fixPassword.js
//  Fix Passwort mit direktem bcrypt Test
//

import sequelize from './database.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

async function fixPassword() {
  try {
    await sequelize.authenticate();
    
    const email = 'admin@facilitymaster.de';
    const password = 'admin123';

    console.log('🔧 Fixing password for:', email);
    
    // Erstelle neuen Hash
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash:', newHash);
    
    // Teste den Hash sofort
    const testResult = await bcrypt.compare(password, newHash);
    console.log('Hash test (before save):', testResult);
    
    if (!testResult) {
      console.log('❌ Hash generation failed!');
      process.exit(1);
    }
    
    // Update User direkt
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    // Direktes Update über Sequelize
    await User.update(
      { passwordHash: newHash },
      { where: { id: user.id } }
    );
    
    console.log('✅ Password updated in DB');
    
    // Lade User neu und teste
    const updatedUser = await User.findOne({ where: { email } });
    console.log('Reloaded hash:', updatedUser.passwordHash.substring(0, 30) + '...');
    
    const isValid = await updatedUser.checkPassword(password);
    console.log('Password check after reload:', isValid);
    
    if (isValid) {
      console.log('\n✅ Password fix successful!');
    } else {
      console.log('\n❌ Still not working. Testing bcrypt directly...');
      const directTest = await bcrypt.compare(password, updatedUser.passwordHash);
      console.log('Direct bcrypt.compare:', directTest);
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

fixPassword();








