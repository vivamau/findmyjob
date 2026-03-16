const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('https://jobs.unicef.org/en-us/listing/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });
        console.log('STATUS:', res.status);
        console.log('BODY LENGTH:', res.data.length);
        console.log('SNIPPET:', res.data.substring(0, 500));
    } catch (err) {
        console.error('ERROR:', err.message);
        if (err.response) {
            console.error('RESPONSE STATUS:', err.response.status);
            console.error('HEADERS:', err.response.headers);
        }
    }
}

test();
