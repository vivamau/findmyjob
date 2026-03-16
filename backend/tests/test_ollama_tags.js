const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:11434/api/tags');
        console.log('STATUS:', res.status);
        console.log('MODELS:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('OLLAMA ERROR:', err.message);
    }
}

test();
