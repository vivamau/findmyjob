const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        const res = await axios.get('https://jobs.unicef.org/en-us/listing/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });
        
        const cleanedText = res.data
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        fs.writeFileSync('/Users/vivamau/projects/findmyjob/backend/tests/unicef_cleaned.txt', cleanedText);
        console.log('Cleaned text saved. Length:', cleanedText.length);
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

test();
