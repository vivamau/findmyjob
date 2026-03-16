const { dbAsync } = require('../db');
const bcrypt = require('bcryptjs');

async function seedUsers() {
  const countRet = await dbAsync.get('SELECT COUNT(*) as c FROM Users');
  if (countRet.c === 0) {
    // console.log('Seeding Default Users...');
    const adminHash = await bcrypt.hash('adminpassword', 10);
    const readerHash = await bcrypt.hash('readerpassword', 10);
    const guestHash = await bcrypt.hash('guestpassword', 10);
    
    // get role ids
    const roles = await dbAsync.all('SELECT id, role_name FROM UserRoles');
    const roleMap = {};
    roles.forEach(r => roleMap[r.role_name] = r.id);

    if (!roleMap['admin']) return;

    await dbAsync.run(
      'INSERT INTO Users (username, password_hash, role_id) VALUES (?, ?, ?)',
      ['admin', adminHash, roleMap['admin']]
    );
    await dbAsync.run(
      'INSERT INTO Users (username, password_hash, role_id) VALUES (?, ?, ?)',
      ['reader1', readerHash, roleMap['reader']]
    );
    await dbAsync.run(
      'INSERT INTO Users (username, password_hash, role_id) VALUES (?, ?, ?)',
      ['guest1', guestHash, roleMap['guest']]
    );
  }
}

module.exports = seedUsers;
