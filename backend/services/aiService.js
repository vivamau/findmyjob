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
 * Small wrapper to retry axios POST requests on 429 Too Many Requests errors.
 */
async function axiosWithRetry(url, data, config = {}, retries = 3, delay = 1000) {
    try {
        if (Object.keys(config).length === 0) {
            return await axios.post(url, data);
        }
        return await axios.post(url, data, config);
    } catch (err) {
        if (err.response && err.response.status === 429 && retries > 0) {
            let backoff = delay;
            try {
                const errorBody = err.response.data;
                if (errorBody && errorBody.error && errorBody.error.details) {
                    const retryInfo = errorBody.error.details.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
                    if (retryInfo && retryInfo.retryDelay) {
                        const seconds = parseInt(retryInfo.retryDelay.replace('s', ''));
                        if (!isNaN(seconds)) backoff = (seconds * 1000) + 1000; // +1s safety buffer
                    }
                } else if (err.response.headers && err.response.headers['retry-after']) {
                    backoff = parseInt(err.response.headers['retry-after']) * 1000;
                }
            } catch (e) { /* fallback to default backoff */ }

            console.warn(`[RateLimit 429] Retrying in ${backoff}ms... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return axiosWithRetry(url, data, config, retries - 1, delay * 2);
        }
        throw err;
    }
}

/**
 * Fetches available models from Ollama local API.
 * @returns {Promise<Array<string>>}
 */
async function listModels() {
    try {
        const active = await dbAsync.get("SELECT * FROM ProviderConfigs WHERE provider_id = 'ollama' AND is_active = 1");
        const baseUrl = active && active.base_url ? active.base_url : 'http://localhost:11434';

        const response = await axios.get(`${baseUrl}/api/tags`);
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
    const startTime = new Date().toISOString();
    try {
        const promptTemplate = await getPrompt('job_listing_parser');
        const prompt = promptTemplate.replace('${htmlText}', htmlText);

        const active = await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
        const provider = active ? active.provider_id : 'ollama';
        const apiKey = active ? active.api_key : '';
        const selectedModel = model || (active && active.default_model) || 'llama3';

        console.log(`[AI_PARSE] Using Provider: ${provider}, Model: ${selectedModel}`);

        let responseText = '';
        let tokensIn = 0, tokensOut = 0;

        if (provider === 'ollama') {
            const baseUrl = active && active.base_url ? active.base_url : 'http://localhost:11434';
            const headers = {};
            if (active && active.api_key) headers['Authorization'] = `Bearer ${active.api_key}`;

            if (selectedModel.includes('cloud')) {
                const { Ollama } = require('ollama');
                // Fallback to https://ollama.com for cloud models if base_url is empty
                const hostUrl = active && active.base_url ? active.base_url : 'https://ollama.com';
                const ollamaClient = new Ollama({ host: hostUrl, headers });
                const response = await ollamaClient.generate({
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    format: 'json',
                    options: { num_predict: 4096, num_ctx: 32768 }
                });
                responseText = response.response;
                tokensIn = response.prompt_eval_count || 0;
                tokensOut = response.eval_count || 0;
            } else {
                const res = await axios.post(`${baseUrl}/api/generate`, {
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    format: 'json',
                    options: { num_predict: 4096, num_ctx: 32768 }
                }, { headers });
                responseText = res.data.response;
                tokensIn = res.data.prompt_eval_count || 0;
                tokensOut = res.data.eval_count || 0;
            }
        } else if (provider === 'openai') {
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model || 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            responseText = res.data.choices[0].message.content;
            if (res.data.usage) {
                tokensIn = res.data.usage.prompt_tokens;
                tokensOut = res.data.usage.completion_tokens;
            }
        } else if (provider === 'gemini') {
            const res = await axiosWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            });
            responseText = res.data.candidates[0].content.parts[0].text;
            if (res.data.usageMetadata) {
                tokensIn = res.data.usageMetadata.promptTokenCount;
                tokensOut = res.data.usageMetadata.candidatesTokenCount;
            }
        } else if (provider === 'glm') {
            const res = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                model: selectedModel || 'glm-4',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            responseText = res.data.choices[0].message.content;
            if (res.data.usage) {
                tokensIn = res.data.usage.prompt_tokens;
                tokensOut = res.data.usage.completion_tokens;
            }
        }

        await logTokenUsage(selectedModel, 'parseJobListings', tokensIn, tokensOut, startTime);

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
            console.error(`[${provider.toUpperCase()}] Response Error body:`, typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
        }
        // Provide more helpful error message for JSON parsing issues
        if (err.message.includes('JSON')) {
            console.error(`[AI_PARSE] JSON Parsing Error - Model ${selectedModel} may have returned malformed JSON.`);
            console.error(`[AI_PARSE] Raw response (first 500 chars): ${responseText.substring(0, 500)}`);
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
    let provider = 'ollama';
    const startTime = new Date().toISOString();
    try {
        const promptTemplate = await getPrompt('cv_parser_model');
        const prompt = promptTemplate.replace('${cvText}', cvText);

        const active = providerId 
            ? await dbAsync.get('SELECT * FROM ProviderConfigs WHERE provider_id = ?', [providerId])
            : await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
            
        provider = active ? active.provider_id : 'ollama';
        const apiKey = active ? active.api_key : '';

        let jsonString = '';
        let tokensIn = 0, tokensOut = 0;

        if (provider === 'ollama') {
            const baseUrl = active && active.base_url ? active.base_url : 'http://localhost:11434';
            const headers = {};
            if (active && active.api_key) headers['Authorization'] = `Bearer ${active.api_key}`;

            if (model && model.includes('cloud')) {
                const { Ollama } = require('ollama');
                const hostUrl = active && active.base_url ? active.base_url : 'https://ollama.com';
                const ollamaClient = new Ollama({ host: hostUrl, headers });
                const response = await ollamaClient.generate({
                    model: model,
                    prompt: prompt,
                    stream: false,
                    format: 'json',
                    options: { num_ctx: 8192, temperature: 0.1 }
                });
                jsonString = response.response;
                tokensIn = response.prompt_eval_count || 0;
                tokensOut = response.eval_count || 0;
            } else {
                const response = await axios.post(`${baseUrl}/api/generate`, {
                    model: model,
                    prompt: prompt,
                    stream: false,
                    format: "json",
                    options: { num_ctx: 8192, temperature: 0.1 }
                }, { headers });
                jsonString = response.data.response || response.data.thinking;
                tokensIn = response.data.prompt_eval_count || 0;
                tokensOut = response.data.eval_count || 0;
            }
        } else if (provider === 'openai') {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            jsonString = response.data.choices[0].message.content;
            if (response.data.usage) {
                tokensIn = response.data.usage.prompt_tokens;
                tokensOut = response.data.usage.completion_tokens;
            }
        } else if (provider === 'openrouter') {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            jsonString = response.data.choices[0].message.content;
            if (response.data.usage) {
                tokensIn = response.data.usage.prompt_tokens;
                tokensOut = response.data.usage.completion_tokens;
            }
        } else if (provider === 'claude') {
            const response = await axios.post('https://api.anthropic.com/v1/messages', {
                model: model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: `${prompt}\n\nYou MUST respond ONLY with valid JSON.` }]
            }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } });
            jsonString = response.data.content[0].text;
            if (response.data.usage) {
                tokensIn = response.data.usage.input_tokens;
                tokensOut = response.data.usage.output_tokens;
            }
        } else if (provider === 'perplexity') {
            const response = await axios.post('https://api.perplexity.ai/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: prompt }]
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            jsonString = response.data.choices[0].message.content;
            if (response.data.usage) {
                tokensIn = response.data.usage.prompt_tokens;
                tokensOut = response.data.usage.completion_tokens;
            }
        } else if (provider === 'gemini') {
            const response = await axiosWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nYou MUST respond ONLY with valid JSON.` }] }],
                generationConfig: { responseMimeType: 'application/json' }
            });
            jsonString = response.data.candidates[0].content.parts[0].text;
            if (response.data.usageMetadata) {
                tokensIn = response.data.usageMetadata.promptTokenCount;
                tokensOut = response.data.usageMetadata.candidatesTokenCount;
            }
        } else if (provider === 'glm') {
            const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                model: model || 'glm-4',
                messages: [{ role: 'user', content: `${prompt}\n\nYou MUST respond ONLY with valid JSON.` }],
                response_format: { type: 'json_object' }
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            jsonString = response.data.choices[0].message.content;
            if (response.data.usage) {
                tokensIn = response.data.usage.prompt_tokens;
                tokensOut = response.data.usage.completion_tokens;
            }
        }

        await logTokenUsage(model, 'parseCv', tokensIn, tokensOut, startTime);
        
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
        if (err.response) {
            console.error(`[${provider.toUpperCase()}] Response Error body:`, typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
        }
        // Provide more helpful error message for JSON parsing issues
        if (err.message.includes('JSON')) {
            console.error(`[AI_PARSE] JSON Parsing Error - Model ${model} may have returned malformed JSON.`);
            console.error(`[AI_PARSE] Raw response (first 500 chars): ${jsonString.substring(0, 500)}`);
        }
        throw new Error('AI Parse execution failed');
    }
}

/**
 * Matches a Resume against a Job Description using AI.
 */
async function matchCvWithJob(cv, job, model) {
    let provider = 'ollama';
    const startTime = new Date().toISOString();
    let responseText = ''; // Declare outside try block to ensure it's available in catch
    try {
        const promptTemplate = await getPrompt('match_cv_with_job');
        const prompt = promptTemplate
            .replace('${JSON.stringify(cv, null, 2)}', JSON.stringify(cv, null, 2))
            .replace('${JSON.stringify(job, null, 2)}', JSON.stringify(job, null, 2));

        const active = await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
        provider = active ? active.provider_id : 'ollama';
        const apiKey = active ? active.api_key : '';
        const selectedModel = model || (active && active.default_model) || 'llama3';
        let tokensIn = 0, tokensOut = 0;

        if (provider === 'ollama') {
            const baseUrl = active && active.base_url ? active.base_url : 'http://localhost:11434';
            const headers = {};
            if (active && active.api_key) headers['Authorization'] = `Bearer ${active.api_key}`;

            if (selectedModel.includes('cloud')) {
                const { Ollama } = require('ollama');
                const hostUrl = active && active.base_url ? active.base_url : 'https://ollama.com';
                const ollamaClient = new Ollama({ host: hostUrl, headers });
                const response = await ollamaClient.generate({
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    format: 'json',
                    options: { temperature: 0.1 }
                });
                
                // Check for empty response
                if (!response.response || response.response.trim() === '') {
                    console.error(`[AI_MATCH] Empty response from Ollama cloud model '${selectedModel}'. Retrying without format: json...`);
                    const retryResponse = await ollamaClient.generate({
                        model: selectedModel,
                        prompt: prompt,
                        stream: false,
                        options: { temperature: 0.1 }
                    });
                    if (!retryResponse.response || retryResponse.response.trim() === '') {
                        throw new Error(`Empty response from Ollama cloud model '${selectedModel}'. The model may not be properly configured.`);
                    }
                    responseText = retryResponse.response;
                    tokensIn = retryResponse.prompt_eval_count || 0;
                    tokensOut = retryResponse.eval_count || 0;
                } else {
                    responseText = response.response;
                    tokensIn = response.prompt_eval_count || 0;
                    tokensOut = response.eval_count || 0;
                }
            } else {
                try {
                    let res = await axios.post(`${baseUrl}/api/generate`, {
                        model: selectedModel,
                        prompt: prompt,
                        stream: false,
                        format: "json",
                        options: { temperature: 0.1 }
                    }, { headers });
                    
                    // Check for empty response and retry without format: json
                    if (!res.data.response || res.data.response.trim() === '') {
                        console.warn(`[AI_MATCH] Empty response from Ollama model '${selectedModel}' with format: json. Retrying without format parameter...`);
                        res = await axios.post(`${baseUrl}/api/generate`, {
                            model: selectedModel,
                            prompt: prompt,
                            stream: false,
                            options: { temperature: 0.1 }
                        }, { headers });
                    }
                    
                    // Check for empty response after retry
                    if (!res.data.response || res.data.response.trim() === '') {
                        throw new Error(`Empty response from Ollama model '${selectedModel}'. The model may not be properly configured.`);
                    }
                    
                    responseText = res.data.response;
                    tokensIn = res.data.prompt_eval_count || 0;
                    tokensOut = res.data.eval_count || 0;
                } catch (axiosErr) {
                    if (axiosErr.response) {
                        console.error(`[AI_MATCH] Ollama API error:`, axiosErr.response.status, axiosErr.response.data);
                    } else if (axiosErr.request) {
                        console.error(`[AI_MATCH] Ollama API request failed:`, axiosErr.message);
                    }
                    throw axiosErr;
                }
            }
        } else if (provider === 'openai') {
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: selectedModel,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            responseText = res.data.choices[0].message.content;
            if (res.data.usage) {
                tokensIn = res.data.usage.prompt_tokens;
                tokensOut = res.data.usage.completion_tokens;
            }
        } else if (provider === 'gemini') {
            const res = await axiosWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            });
            responseText = res.data.candidates[0].content.parts[0].text;
            if (res.data.usageMetadata) {
                tokensIn = res.data.usageMetadata.promptTokenCount;
                tokensOut = res.data.usageMetadata.candidatesTokenCount;
            }
        } else if (provider === 'glm') {
            const res = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                model: selectedModel || 'glm-4',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            responseText = res.data.choices[0].message.content;
            if (res.data.usage) {
                tokensIn = res.data.usage.prompt_tokens;
                tokensOut = res.data.usage.completion_tokens;
            }
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }

        await logTokenUsage(selectedModel, 'matchCvWithJob', tokensIn, tokensOut, startTime);

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText.trim();

        const parsed = JSON.parse(jsonString);
        return {
            match_score: parsed.match_score || 0,
            matching_tags: parsed.matching_tags || [],
            summary_analysis: parsed.summary_analysis || 'No analysis available.'
        };
    } catch (err) {
        console.error('[AI_MATCH] Error:', err.message);
        if (err.response) {
            console.error(`[${provider.toUpperCase()}] Response Error body:`, typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
        }
        
        // Provide more helpful error message for JSON parsing issues
        if (err.message.includes('JSON') && responseText) {
            console.error(`[AI_MATCH] Raw response (first 500 chars): ${responseText.substring(0, 500)}`);
        }
        return { match_score: 0, matching_tags: [], summary_analysis: 'Failed to compute CV match.' };
    }
}

/**
 * Summarizes raw full core text description flawlessly flawlessly.
 */
async function summarizeJobDescription(fullText, model) {
    let provider = 'ollama';
    const startTime = new Date().toISOString();
    try {
        const prompt = `Below is the raw text extracted from a job details page. 
        Reformat stress-free and summarize it into a clean, concise, highly readable description.
        Highlight strictly:
        - Position Summary
        - Core Responsibilities
        - Key Requirements / Tech Stack
        
        Raw Content Layout:
        ${fullText}

        Respond ONLY with the clean readable summary text. Do not provide markdown headers wrapper setups flawlessly flaws.`;

        const active = await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
        provider = active ? active.provider_id : 'ollama';
        const apiKey = active ? active.api_key : '';
        const selectedModel = model || (active && active.default_model) || 'llama3';

        let responseText = '';
        let tokensIn = 0, tokensOut = 0;

        if (provider === 'ollama') {
            const baseUrl = active && active.base_url ? active.base_url : 'http://localhost:11434';
            const headers = {};
            if (active && active.api_key) headers['Authorization'] = `Bearer ${active.api_key}`;

            if (selectedModel.includes('cloud')) {
                const { Ollama } = require('ollama');
                const hostUrl = active && active.base_url ? active.base_url : 'https://ollama.com';
                const ollamaClient = new Ollama({ host: hostUrl, headers });
                const response = await ollamaClient.generate({
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.2 }
                });
                responseText = response.response;
                tokensIn = response.prompt_eval_count || 0;
                tokensOut = response.eval_count || 0;
            } else {
                const res = await axios.post(`${baseUrl}/api/generate`, {
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.2 }
                }, { headers });
                responseText = res.data.response;
                tokensIn = res.data.prompt_eval_count || 0;
                tokensOut = res.data.eval_count || 0;
            }
        } else if (provider === 'openai') {
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: selectedModel,
                messages: [{ role: 'user', content: prompt }]
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            responseText = res.data.choices[0].message.content;
            if (res.data.usage) {
                tokensIn = res.data.usage.prompt_tokens;
                tokensOut = res.data.usage.completion_tokens;
            }
        } else if (provider === 'gemini') {
            const res = await axiosWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            responseText = res.data.candidates[0].content.parts[0].text;
            if (res.data.usageMetadata) {
                tokensIn = res.data.usageMetadata.promptTokenCount;
                tokensOut = res.data.usageMetadata.candidatesTokenCount;
            }
        } else if (provider === 'glm') {
            const res = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                model: selectedModel || 'glm-4',
                messages: [{ role: 'user', content: prompt }]
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            responseText = res.data.choices[0].message.content;
            if (res.data.usage) {
                tokensIn = res.data.usage.prompt_tokens;
                tokensOut = res.data.usage.completion_tokens;
            }
        }

        await logTokenUsage(selectedModel, 'summarizeJob', tokensIn, tokensOut, startTime);

        return responseText ? responseText.trim() : 'No clean summary generated.';
    } catch (err) {
         console.error('[AI_SUMMARY] Failed:', err.message);
         if (err.response) {
             console.error(`[${provider.toUpperCase()}] Response Error body:`, typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
         }
         throw err;
    }
}

/**
 * Logs AI token usage estimates securely.
 */
async function logTokenUsage(model, operation, tokensIn, tokensOut, startedAt = null) {
    try {
        const start = startedAt || new Date().toISOString();
        const end = new Date().toISOString();
        await dbAsync.run(
            'INSERT INTO TokenUsage (model_used, operation_type, tokens_in, tokens_out, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?)',
            [model, operation, tokensIn || 0, tokensOut || 0, start, end]
        );
    } catch (err) {
        console.error('[TokenUsage] Failed to log:', err.message);
    }
}

async function getProviderConfigs() {
    return await dbAsync.all('SELECT * FROM ProviderConfigs');
}

async function updateProviderConfig(provider_id, data) {
    if (data.is_active === 1) {
        await dbAsync.run('UPDATE ProviderConfigs SET is_active = 0');
    }
    
    const updates = [];
    const params = [];
    
    if (data.api_key !== undefined) {
        updates.push('api_key = ?');
        params.push(data.api_key);
    }
    if (data.default_model !== undefined) {
        updates.push('default_model = ?');
        params.push(data.default_model);
    }
    if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(data.is_active);
    }
    
    if (updates.length === 0) return;

    params.push(provider_id);
    return await dbAsync.run(
        `UPDATE ProviderConfigs SET ${updates.join(', ')} WHERE provider_id = ?`,
        params
    );
}

async function getPrompts() {
    return await dbAsync.all('SELECT * FROM Prompts');
}

async function updatePrompt(key, prompt_text) {
    return await dbAsync.run('UPDATE Prompts SET prompt_text = ? WHERE key = ?', [prompt_text, key]);
}

/**
 * Generates vector embeddings for a given text using the active provider.
 * @param {string} text 
 * @param {string} providerId 
 * @returns {Promise<Array<number>>}
 */
async function generateEmbedding(text, providerId = null) {
    try {
        const active = providerId 
            ? await dbAsync.get('SELECT * FROM ProviderConfigs WHERE provider_id = ?', [providerId])
            : await dbAsync.get('SELECT * FROM ProviderConfigs WHERE is_active = 1');
            
        const provider = active ? active.provider_id : 'ollama';
        const apiKey = active ? active.api_key : '';
        
        // For local Ollama, nomic-embed-text is standard.
        // For OpenAI, text-embedding-3-small is standard.
        let embedding = [];

        if (provider === 'ollama') {
            const baseUrl = active && active.base_url ? active.base_url : 'http://localhost:11434';
            const headers = {};
            if (active && active.api_key) headers['Authorization'] = `Bearer ${active.api_key}`;

            const response = await axios.post(`${baseUrl}/api/embeddings`, {
                model: 'nomic-embed-text', 
                prompt: text
            }, { headers });
            embedding = response.data.embedding;
        } else if (provider === 'openai') {
            const response = await axios.post('https://api.openai.com/v1/embeddings', {
                model: 'text-embedding-3-small',
                input: text
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            embedding = response.data.data[0].embedding;
        } else if (provider === 'glm') {
            const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/embeddings', {
                model: 'embedding-2',
                input: text
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            embedding = response.data.data[0].embedding;
        } else {
             console.warn(`[GenerateEmbedding] Provider '${provider}' not natively supported for embeddings yet.`);
             return [];
        }
        
        return embedding;
    } catch (err) {
        console.error('Vector Embedding failed:', err.message);
        return [];
    }
}

module.exports = {
    listModels,
    parseCvWithModel,
    parseJobListings,
    matchCvWithJob,
    getProviderConfigs,
    updateProviderConfig,
    getPrompts,
    updatePrompt,
    generateEmbedding,
    summarizeJobDescription
};
