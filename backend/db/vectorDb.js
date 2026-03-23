const lancedb = require('@lancedb/lancedb');
const path = require('path');
const fs = require('fs');

const vectorDbDir = path.resolve(__dirname, '../../backend/data/lancedb');

let dbConnection = null;

/**
 * Ensures the LanceDB directory exists and connects to it.
 */
async function getVectorDb() {
  if (dbConnection) return dbConnection;

  if (!fs.existsSync(vectorDbDir)) {
    fs.mkdirSync(vectorDbDir, { recursive: true });
  }

  // Connect to LanceDB local instance
  dbConnection = await lancedb.connect(vectorDbDir);
  return dbConnection;
}

module.exports = {
  getVectorDb,
  vectorDbDir
};
