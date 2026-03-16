const axios = require('axios');
const { dbAsync } = require('../db');

async function test() {
    try {
        const sources = await dbAsync.all('SELECT * FROM JobSources');
        for (const source of sources) {
            console.log(`[SCRAPE] Fetching: ${source.url}`);
            try {
                if (source.url.includes('myworkdaysite.com')) {
                    console.log('Skipping Workday for this test...');
                } else {
                    const page = await axios.get(source.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                        }
                    });
                    console.log(`[SUCCESS] fetched ${source.url} length: ${page.data.length}`);
                }
            } catch (innerErr) {
                console.error(`[ERROR] SCRAPE FAIL for ${source.url}:`, innerErr.message);
                if (innerErr.response) console.error(`[STATUS]`, innerErr.response.status);
            }
        }
    } catch (err) {
        console.error('TOTAL ERR:', err.message);
    }
}

test();
