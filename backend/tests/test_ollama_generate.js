const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://localhost:11434/api/generate', {
            model: "qwen3.5:9b",
            prompt: "Say Hello",
            stream: false
        });
        console.log('STATUS:', res.status);
        console.log('RESPONSE:', res.data.response);
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

test();
