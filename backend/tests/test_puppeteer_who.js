const { scrapeDynamicPage } = require('../services/scraperService');
const { parseJobListings } = require('../services/aiService');
const runMigrations = require('../scripts/run_migrations');

async function test() {
    await runMigrations(); // just in case
    try {
        const html = await scrapeDynamicPage('https://careers.who.int/careersection/ex/jobsearch.ftl');
        const cleanedText = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log('[SCRAPE] Stripped length:', cleanedText.length);
        const jobs = await parseJobListings(cleanedText); 
        console.log('JOBS FOUND:', jobs.length);
        console.log('JOBS LIST:', JSON.stringify(jobs, null, 2));
    } catch (err) {
         console.error('ERROR:', err.message);
    }
}

test();
