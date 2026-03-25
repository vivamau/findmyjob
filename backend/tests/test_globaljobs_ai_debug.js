/**
 * Detailed debug script for globaljobs.org AI parsing issue
 */

const axios = require('axios');
const { scrapeDynamicPage } = require('../services/scraperService');
const { getPrompt } = require('../services/aiService');

const GLOBALJOBS_URL = 'https://globaljobs.org/';

async function debugAIParsing() {
    console.log('=== DEBUGGING GLOBALJOBS.ORG AI PARSING ===\n');

    // Fetch the page content
    console.log('Fetching page content...');
    const html = await scrapeDynamicPage(GLOBALJOBS_URL);
    console.log(`HTML length: ${html.length}\n`);

    // Clean the text
    const cleanedText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);

    console.log(`Cleaned text length: ${cleanedText.length}`);
    console.log('\n=== FULL CLEANED TEXT ===');
    console.log(cleanedText);
    console.log('\n=== END OF CLEANED TEXT ===\n');

    // Load the prompt
    const promptTemplate = await getPrompt('job_listing_parser');
    const prompt = promptTemplate.replace('${htmlText}', cleanedText);

    console.log('\n=== PROMPT SENT TO AI ===');
    console.log(prompt.substring(0, 2000));
    console.log('... (truncated for display)');
    console.log('\n=== END OF PROMPT ===\n');

    // Try to call the AI directly
    console.log('Calling AI directly...');
    try {
        const { dbAsync } = require('../db');
        const active = await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
        const provider = active ? active.provider_id : 'ollama';
        const selectedModel = active && active.default_model ? active.default_model : 'llama3';

        console.log(`Provider: ${provider}, Model: ${selectedModel}\n`);

        if (provider === 'ollama' && selectedModel.includes('cloud')) {
            const { Ollama } = require('ollama');
            const hostUrl = active && active.base_url ? active.base_url : 'https://ollama.com';
            const headers = {};
            if (active && active.api_key) headers['Authorization'] = `Bearer ${active.api_key}`;

            const ollamaClient = new Ollama({ host: hostUrl, headers });
            const response = await ollamaClient.generate({
                model: selectedModel,
                prompt: prompt,
                stream: false,
                format: 'json',
                options: { num_predict: 4096, num_ctx: 32768 }
            });

            console.log('\n=== RAW AI RESPONSE ===');
            console.log(response.response);
            console.log('\n=== END OF RAW AI RESPONSE ===\n');

            console.log(`Response length: ${response.response.length}`);
            console.log(`Prompt eval count: ${response.prompt_eval_count}`);
            console.log(`Eval count: ${response.eval_count}`);

            // Try to parse the JSON
            const jsonMatch = response.response.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : response.response.trim();

            console.log('\n=== EXTRACTED JSON STRING ===');
            console.log(jsonString);
            console.log('\n=== END OF EXTRACTED JSON ===\n');

            if (!jsonString) {
                console.log('[ERROR] Empty JSON string extracted!');
            } else {
                try {
                    const parsed = JSON.parse(jsonString);
                    console.log('\n=== PARSED JSON ===');
                    console.log(JSON.stringify(parsed, null, 2));
                    console.log('\n=== END OF PARSED JSON ===\n');

                    if (parsed.jobs) {
                        console.log(`Found ${parsed.jobs.length} jobs`);
                    } else {
                        console.log('[ERROR] No "jobs" key in parsed JSON!');
                    }
                } catch (parseErr) {
                    console.error('[ERROR] JSON parsing failed:', parseErr.message);
                }
            }
        }
    } catch (err) {
        console.error('AI call failed:', err.message);
        if (err.response) {
            console.error('Response:', err.response.data);
        }
    }

    console.log('\n=== DEBUG COMPLETE ===');
}

debugAIParsing().catch(console.error);
