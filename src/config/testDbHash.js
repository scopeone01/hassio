//
//  testDbHash.js
//  Test mit Hash aus DB
//

import bcrypt from 'bcrypt';

const password = 'admin123';
const dbHash = '$2b$10$tc8o/k8dO1OzBB.YQK0Jz.ubJWV8MFN6bYBuhKlctvVL02RtYgiBu';

console.log('Testing password:', password);
console.log('Against hash:', dbHash);
console.log('');

const isValid = await bcrypt.compare(password, dbHash);
console.log('Password matches:', isValid);

if (!isValid) {
  console.log('\n❌ Hash does not match! Creating new hash...');
  const newHash = await bcrypt.hash(password, 10);
  console.log('New hash:', newHash);
  console.log('\nRun this SQL to update:');
  console.log(`UPDATE users SET password_hash = '${newHash}' WHERE email = 'admin@facilitymaster.de';`);
}








