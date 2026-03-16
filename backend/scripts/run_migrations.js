const fs = require('fs');
const path = require('path');
const { dbAsync } = require('../db');

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  
  await dbAsync.run("CREATE TABLE IF NOT EXISTS SchemaMigrations (filename TEXT PRIMARY KEY);");

  for (const file of files) {
    const alreadyRan = await dbAsync.get("SELECT 1 FROM SchemaMigrations WHERE filename = ?", [file]);
    if (alreadyRan) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    try {
        await dbAsync.exec(sql);
        await dbAsync.run("INSERT OR IGNORE INTO SchemaMigrations (filename) VALUES (?)", [file]);
    } catch (err) {
        if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
            // Already applied before tracking was introduced. Record as ran.
            await dbAsync.run("INSERT OR IGNORE INTO SchemaMigrations (filename) VALUES (?)", [file]);
        } else {
            console.error(`Migration failed in ${file}:`, err.message);
            throw err;
        }
    }
  }
}

module.exports = runMigrations;
