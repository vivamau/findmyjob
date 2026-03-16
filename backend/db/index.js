const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.resolve(__dirname, '../../backend/data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// In-memory format for tests! If process.env.NODE_ENV is test, use in mem.
const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.resolve(dbDir, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    // Enable PRAGMA foreign_keys
    db.run('PRAGMA foreign_keys=ON');
    // console.log(`Connected to the SQLite database (${dbPath}).`);
  }
});

// A small utility wrapper for promises
const dbAsync = {
  run: (sql, params = []) => new Promise((res, rej) => {
    db.run(sql, params, function (err) {
      if (err) rej(err); else res(this);
    });
  }),
  all: (sql, params = []) => new Promise((res, rej) => {
    db.all(sql, params, (err, rows) => {
      if (err) rej(err); else res(rows);
    });
  }),
  get: (sql, params = []) => new Promise((res, rej) => {
    db.get(sql, params, (err, row) => {
      if (err) rej(err); else res(row);
    });
  }),
  exec: (sql) => new Promise((res, rej) => {
    db.exec(sql, (err) => {
      if (err) rej(err); else res();
    });
  })
};

module.exports = { db, dbAsync };
