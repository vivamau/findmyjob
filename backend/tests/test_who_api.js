const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('https://careers.who.int/careersection/rest/jobboard/searchjobs?lang=en&portal=101430233', {
            pageNo: 1,
            pageSize: 25,
            sortingAttribute: "0",
            isInitialFetch: true
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        console.log('STATUS:', res.status);
        console.log('BODY:', JSON.stringify(res.data, null, 2).substring(0, 5000));
    } catch (err) {
        console.error('ERROR:', err.message);
        if (err.response) {
            console.error('STATUS:', err.response.status);
            console.error('BODY:', err.response.data);
        }
    }
}

test();
