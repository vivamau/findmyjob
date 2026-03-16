const { dbAsync } = require('../db');

async function seedUserRoles() {
  const countRet = await dbAsync.get('SELECT COUNT(*) as c FROM UserRoles');
  if (countRet.c === 0) {
    // console.log('Seeding UserRoles...');
    const roles = ['admin', 'reader', 'guest'];
    for (const r of roles) {
      await dbAsync.run('INSERT INTO UserRoles (role_name) VALUES (?)', [r]);
    }
  }
}

module.exports = seedUserRoles;
