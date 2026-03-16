const axios = require('axios');
const { parseJobListings } = require('../services/aiService');
const runMigrations = require('../scripts/run_migrations');

async function test() {
    await runMigrations(); // config setup if needed
    try {
        const res = await axios.get('https://jobs.unicef.org/en-us/listing/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log('Fetching Complete. Parsing with AI...');
        const jobs = await parseJobListings(res.data, 'gpt-4o'); 
        console.log('JOBS FOUND:', jobs.length);
        console.log('JOBS LIST:', JSON.stringify(jobs, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

test();
