const axios = require('axios');

async function testQwen() {
    try {
        const response = await axios.post('http://localhost:11434/api/generate', {
            model: 'qwen3.5:9b',
            prompt: 'Extract work experience from: John Doe has 3 years at Google as Software Engineer.',
            stream: false,
            format: 'json'
        });
        console.log("=== OLLAMA RESPONSE ===");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.error(err.message);
    }
}

testQwen();
