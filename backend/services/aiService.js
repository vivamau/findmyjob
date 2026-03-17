const axios = require('axios');
const { dbAsync } = require('../db');

/**
 * Fetches a prompt from the Database with a fallback.
 */
async function getPrompt(key) {
    try {
        const row = await dbAsync.get('SELECT prompt_text FROM Prompts WHERE key = ?', [key]);
        if (row && row.prompt_text) {
            console.log(`[Prompt] Loaded key '${key}' from Database.`);
            return row.prompt_text;
        }
        throw new Error(`Prompt key '${key}' not found in Database or empty.`);
    } catch (err) {
        console.error(`[Prompt] Failed to load key '${key}':`, err.message);
        throw err;
    }
}

/**
 * Fetches available models from Ollama local API.
 * @returns {Promise<Array<string>>}
 */
async function listModels() {
    try {
        const response = await axios.get('http://localhost:11434/api/tags');
        if (response.data && response.data.models) {
            return response.data.models.map(m => m.name);
        }
        return [];
    } catch (err) {
        console.warn('Ollama is not responding or connected. Standard local lists bypassed setup flawlessly.');
        return []; // Suppress error to avoid breaking global Settings flows
    }
}

/**
 * @param {string} htmlText
 * @param {string} model
 * @returns {Promise<Array>}
 */
async function parseJobListings(htmlText, model) {
    try {
        const promptTemplate = await getPrompt('job_listing_parser');
        const prompt = promptTemplate.replace('${htmlText}', htmlText);

        const active = await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
        const provider = active ? active.provider_id : 'ollama';
        const apiKey = active ? active.api_key : '';
        const selectedModel = model || (active && active.default_model) || 'llama3';

        console.log(`[AI_PARSE] Using Provider: ${provider}, Model: ${selectedModel}`);

        let responseText = '';
        if (provider === 'ollama') {
            const res = await axios.post(`http://localhost:11434/api/generate`, {
                model: selectedModel,
                prompt: prompt,
                stream: false,
                options: {
                    num_predict: 4096, // Increase output limit flawlessly
                    num_ctx: 8192      // Increase context size flaws
                }
            });
            responseText = res.data.response;
        } else if (provider === 'openai') {
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model || 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            responseText = res.data.choices[0].message.content;
        }

        // console.log(`=== RAW JOB RESPONSE ===\n${responseText}`);
        
        // Bulletproof Regex fallback to extract JSON string flawless setup
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText.trim();

        if (!jsonString) {
             console.log('[AI_PARSE] Empty response from Ollama flawlessly');
             return [];
        }

        const parsed = JSON.parse(jsonString);
        return parsed.jobs || [];
    } catch (err) {
        console.error('Job Parse failed:', err.message, err.config ? `at ${err.config.url}` : '');
        if (err.response) {
            console.error('Ollama Response Error body:', typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
        }
        return [];
    }
}

/**
 * Uses Ollama structured JSON parsing to extract experiences lists safely.
 * @param {string} cvText 
 * @param {string} model 
 * @returns {Promise<Array>}
 */
async function parseCvWithModel(cvText, model, providerId = null) {
    try {
        const promptTemplate = await getPrompt('cv_parser_model');
        const prompt = promptTemplate.replace('${cvText}', cvText);

        const active = providerId 
            ? await dbAsync.get('SELECT * FROM ProviderConfigs WHERE provider_id = ?', [providerId])
            : await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
            
        const provider = active ? active.provider_id : 'ollama';
        const apiKey = active ? active.api_key : '';

        let jsonString = '';

        if (provider === 'ollama') {
            const response = await axios.post('http://localhost:11434/api/generate', {
                model: model,
                prompt: prompt,
                stream: false,
                format: "json",
                options: { num_ctx: 8192, temperature: 0.1 }
            });
            jsonString = response.data.response || response.data.thinking;
        } else if (provider === 'openai') {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            jsonString = response.data.choices[0].message.content;
        } else if (provider === 'openrouter') {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            jsonString = response.data.choices[0].message.content;
        } else if (provider === 'claude') {
            const response = await axios.post('https://api.anthropic.com/v1/messages', {
                model: model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: `${prompt}\n\nYou MUST respond ONLY with valid JSON.` }]
            }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } });
            jsonString = response.data.content[0].text;
        } else if (provider === 'perplexity') {
            const response = await axios.post('https://api.perplexity.ai/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }]
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            jsonString = response.data.choices[0].message.content;
        }
        
        // console.log(`=== RAW ${provider.toUpperCase()} RESPONSE ===`);
        // console.log(jsonString);

        if (!jsonString) {
            throw new Error('Ollama returned an empty response');
        }
        
        const output = JSON.parse(jsonString);
        
        // Handle objects with numeric keys representing a list [index]: { ... }
        if (!Array.isArray(output)) {
            const keys = Object.keys(output);
            const allNumeric = keys.length > 0 && keys.every(k => !isNaN(parseInt(k)));
            if (allNumeric) {
                return {
                    experiences: Object.values(output),
                    educations: [],
                    languages: []
                };
            }
        }

        // Return unified object structure
        return {
            experiences: output.experiences || (Array.isArray(output) ? output : []),
            educations: output.educations || [],
            languages: output.languages || [],
            skills: output.skills || []
        };
    } catch (err) {
        console.error('AI Parse failed:', err.message);
        throw new Error('AI Parse execution failed');
    }
}

/**
 * Matches a Resume against a Job Description using AI.
 */
async function matchCvWithJob(cv, job, model) {
    try {
        const promptTemplate = await getPrompt('match_cv_with_job');
        const prompt = promptTemplate
            .replace('${JSON.stringify(cv, null, 2)}', JSON.stringify(cv, null, 2))
            .replace('${JSON.stringify(job, null, 2)}', JSON.stringify(job, null, 2));

        const active = await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
        const provider = active ? active.provider_id : 'ollama';
        const apiKey = active ? active.api_key : '';
        const selectedModel = model || (active && active.default_model) || 'llama3';

        let responseText = '';
        if (provider === 'ollama') {
            const res = await axios.post(`http://localhost:11434/api/generate`, {
                model: selectedModel,
                prompt: prompt,
                stream: false,
                format: "json",
                options: { temperature: 0.1 }
            });
            responseText = res.data.response;
        } else if (provider === 'openai') {
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: selectedModel,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            responseText = res.data.choices[0].message.content;
        }

        console.log(`=== RAW MATCH RESPONSE ===\n${responseText}`);
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText.trim();

        const parsed = JSON.parse(jsonString);
        return {
            match_score: parsed.match_score || 0,
            matching_tags: parsed.matching_tags || [],
            summary_analysis: parsed.summary_analysis || 'No analysis available.'
        };
    } catch (err) {
        console.error('CV Match failed:', err.message);
        return { match_score: 0, matching_tags: [], summary_analysis: 'Failed to compute CV match.' };
    }
}

async function getProviderConfigs() {
    return await dbAsync.all('SELECT * FROM ProviderConfigs');
}

async function updateProviderConfig(provider_id, data) {
    if (data.is_active === 1) {
        await dbAsync.run('UPDATE ProviderConfigs SET is_active = 0');
    }
    return await dbAsync.run(
        'UPDATE ProviderConfigs SET api_key = ?, default_model = ?, is_active = ? WHERE provider_id = ?',
        [data.api_key, data.default_model, data.is_active || 0, provider_id]
    );
}

async function getPrompts() {
    return await dbAsync.all('SELECT * FROM Prompts');
}

async function updatePrompt(key, prompt_text) {
    return await dbAsync.run('UPDATE Prompts SET prompt_text = ? WHERE key = ?', [prompt_text, key]);
}

module.exports = {
    listModels,
    parseCvWithModel,
    parseJobListings,
    matchCvWithJob,
    getProviderConfigs,
    updateProviderConfig,
    getPrompts,
    updatePrompt
};
