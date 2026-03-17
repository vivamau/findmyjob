const { parseJobListings } = require('./services/aiService');
const runMigrations = require('./scripts/run_migrations');

async function test() {
    console.log('Running migrations to ensure table exists...');
    await runMigrations();

    const dummyHtml = '<html><body><h1>Job Title</h1></body></html>';
    // We can't easily capture the internal prompt without wrapping or logging
    // Let's modify aiService.js temporarily or add a log inside parseJobListings
}

test();
