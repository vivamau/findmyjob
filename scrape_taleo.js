const { scrapeDynamicPage } = require('./backend/services/scraperService');
const { parseJobListings } = require('./backend/services/aiService');

async function testTaleo() {
    const url = 'https://iaea.taleo.net/careersection/ex/jobsearch.ftl';
    const html = await scrapeDynamicPage(url);
    console.log(`[TEST] Scraped HTML Length: ${html.length}`);

    const cleanedText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);

    console.log(`[TEST] Cleaned Text: \n${cleanedText.substring(0, 1000)}...\n`);

    const jobs = await parseJobListings(cleanedText);
    console.log(`[TEST] Found Jobs: ${jobs.length}`);
    console.log(JSON.stringify(jobs, null, 2));
}

testTaleo().catch(console.error);
