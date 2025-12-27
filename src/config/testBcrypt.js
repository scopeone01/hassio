//
//  testBcrypt.js
//  Direkter bcrypt Test
//

import bcrypt from 'bcrypt';

const password = 'admin123';
const hash = await bcrypt.hash(password, 10);

console.log('Generated hash:', hash);
console.log('Hash starts with $2a$:', hash.startsWith('$2a$'));
console.log('Hash starts with $2b$:', hash.startsWith('$2b$'));

const isValid = await bcrypt.compare(password, hash);
console.log('Password matches:', isValid);

// Test with existing hash from DB
const existingHash = '$2b$10$P9/4/vYDHeYcMIFUmy899uX';
console.log('\nTesting with existing hash (truncated)...');
console.log('Note: Hash is truncated, need full hash from DB');








