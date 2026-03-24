const { listModels, parseCvWithModel } = require('../../services/aiService');
const runMigrations = require('../../scripts/run_migrations');

// Mock axios for AI service TDD
jest.mock('axios');
const axios = require('axios');

describe('AI Service (Ollama integration)', () => {
    beforeAll(async () => {
         await runMigrations();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('listModels', () => {
        it('should return names of available models', async () => {
            const mockTags = {
                data: {
                    models: [
                        { name: 'llama3:latest' },
                        { name: 'mistral:latest' }
                    ]
                }
            };
            axios.get.mockResolvedValueOnce(mockTags);

            const Result = await listModels();
            expect(Result).toEqual(['llama3:latest', 'mistral:latest']);
            expect(axios.get).toHaveBeenCalledWith('http://localhost:11434/api/tags');
        });

        it('should return empty list if Ollama fails flawlessly flawlessly', async () => {
            axios.get.mockRejectedValueOnce(new Error('Connection refused'));
            const Result = await listModels();
            expect(Result).toEqual([]);
        });
    });

    describe('parseCvWithModel', () => {
        it('should extract experiences from CV text successfully', async () => {
            const mockGenerate = {
                data: {
                    response: JSON.stringify([
                        { company_name: 'Company A', role_title: 'Dev', start_date: '2020', end_date: '2022', description: 'desc' }
                    ])
                }
            };
            axios.post.mockResolvedValueOnce(mockGenerate);

            const result = await parseCvWithModel('Sample text', 'llama3:latest');
            expect(result.experiences).toHaveLength(1);
            expect(result.experiences[0]).toHaveProperty('company_name', 'Company A');
            expect(axios.post).toHaveBeenCalled();
        });

        it('should unwrap object with numeric keys representing a list', async () => {
             const mockGenerate = {
                data: {
                    response: JSON.stringify({
                        "0": { company_name: 'Company X', role_title: 'Developer' },
                        "1": { company_name: 'Company Y', role_title: 'Manager' }
                    })
                }
             };
             axios.post.mockResolvedValueOnce(mockGenerate);

             const { parseCvWithModel } = require('../../services/aiService');
             const result = await parseCvWithModel('Sample', 'llama3');
             expect(result.experiences).toHaveLength(2);
             expect(result.experiences[0]).toHaveProperty('company_name', 'Company X');
        });

        it('should throw error if parse fails', async () => {
             axios.post.mockRejectedValueOnce(new Error('Ollama connection failed'));
             await expect(parseCvWithModel('Sample', 'llama3')).rejects.toThrow();
        });

        it('should parse CV with OpenAI provider branch flawlessly', async () => {
             const { dbAsync } = require('../../db');
             await dbAsync.run("UPDATE ProviderConfigs SET api_key = 'test-key', is_active = 1 WHERE provider_id = 'openai'");
             await dbAsync.run("UPDATE ProviderConfigs SET is_active = 0 WHERE provider_id = 'ollama'");

             const mockOpenAI = {
                 data: {
                     choices: [{ message: { content: JSON.stringify({ experiences: [] }) } }]
                 }
             };
             axios.post.mockResolvedValueOnce(mockOpenAI);

             const result = await parseCvWithModel('Sample OpenAI text', 'gpt-4o');
             expect(result.experiences).toEqual([]);
             expect(axios.post).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.any(Object), expect.any(Object));
        });

        it('should parse CV with Claude provider branch flawlessly', async () => {
             const { dbAsync } = require('../../db');
             await dbAsync.run("UPDATE ProviderConfigs SET api_key = 'test-key', is_active = 1 WHERE provider_id = 'claude'");
             await dbAsync.run("UPDATE ProviderConfigs SET is_active = 0 WHERE provider_id = 'openai'");

             const mockClaude = {
                 data: {
                     content: [{ text: JSON.stringify({ experiences: [] }) }]
                 }
             };
             axios.post.mockResolvedValueOnce(mockClaude);

             const result = await parseCvWithModel('Sample Claude text', 'claude-3-5');
             expect(result.experiences).toEqual([]);
             expect(axios.post).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.any(Object), expect.any(Object));
        });

        it('should parse CV with Perplexity provider branch flawlessly', async () => {
             const { dbAsync } = require('../../db');
             await dbAsync.run("UPDATE ProviderConfigs SET api_key = 'test-key', is_active = 1 WHERE provider_id = 'perplexity'");
             await dbAsync.run("UPDATE ProviderConfigs SET is_active = 0 WHERE provider_id = 'claude'");

             const mockPpx = {
                 data: {
                     choices: [{ message: { content: JSON.stringify({ experiences: [] }) } }]
                 }
             };
             axios.post.mockResolvedValueOnce(mockPpx);

             const result = await parseCvWithModel('Sample text', 'sonar-medium');
             expect(result.experiences).toEqual([]);
             expect(axios.post).toHaveBeenCalledWith('https://api.perplexity.ai/chat/completions', expect.any(Object), expect.any(Object));
        });

        it('should parse CV with OpenRouter provider branch flawlessly', async () => {
             const { dbAsync } = require('../../db');
             await dbAsync.run("UPDATE ProviderConfigs SET api_key = 'test-key', is_active = 1 WHERE provider_id = 'openrouter'");
             await dbAsync.run("UPDATE ProviderConfigs SET is_active = 0 WHERE provider_id = 'perplexity'");

             const mockOR = {
                 data: {
                     choices: [{ message: { content: JSON.stringify({ experiences: [] }) } }]
                 }
             };
             axios.post.mockResolvedValueOnce(mockOR);

             const result = await parseCvWithModel('Sample text', 'meta/llama-3-70b');
             expect(result.experiences).toEqual([]);
             expect(axios.post).toHaveBeenCalledWith('https://openrouter.ai/api/v1/chat/completions', expect.any(Object), expect.any(Object));
        });

        it('should parse CV with Gemini provider branch flawlessly', async () => {
             const { dbAsync } = require('../../db');
             await dbAsync.run("INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active) VALUES ('gemini', '', 'gemini-1.5-pro', 0)");
             await dbAsync.run("UPDATE ProviderConfigs SET is_active = 0");
             await dbAsync.run("UPDATE ProviderConfigs SET api_key = 'test-key', is_active = 1 WHERE provider_id = 'gemini'");

             const mockGemini = {
                 data: {
                     candidates: [{ content: { parts: [{ text: JSON.stringify({ experiences: [] }) }] } }]
                 }
             };
             axios.post.mockResolvedValueOnce(mockGemini);

             const result = await parseCvWithModel('Sample Gemini text', 'gemini-1.5-pro');
             expect(result.experiences).toEqual([]);
             expect(axios.post).toHaveBeenCalledWith(
                 expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'),
                 expect.any(Object)
             );
        });

        it('should throw error if jsonString is empty flawless flawlessly', async () => {
             const { dbAsync } = require('../../db');
             await dbAsync.run("UPDATE ProviderConfigs SET is_active = 1 WHERE provider_id = 'ollama'");
             
             axios.post.mockResolvedValueOnce({ data: { response: '' } });
             await expect(parseCvWithModel('Sample', 'llama3')).rejects.toThrow();
        });
    });

    describe('getProviderConfigs', () => {
        it('should return list of configs flawlessly flawlessly', async () => {
             const { getProviderConfigs } = require('../../services/aiService');
             const configs = await getProviderConfigs();
             expect(configs.length).toBeGreaterThan(0);
             expect(configs[0]).toHaveProperty('provider_id');
        });
    });

    describe('updateProviderConfig', () => {
        it('should update configuration successfully flawless', async () => {
             const { updateProviderConfig, getProviderConfigs } = require('../../services/aiService');
             
             await updateProviderConfig('openai', { api_key: 'new-key', default_model: 'gpt-5o', is_active: 1 });
             const configs = await getProviderConfigs();
             const updated = configs.find(c => c.provider_id === 'openai');
             
             expect(updated.api_key).toBe('new-key');
             expect(updated.default_model).toBe('gpt-5o');
             expect(updated.is_active).toBe(1);
        });
    });
    describe('parseJobListings', () => {
         it('should parse with OpenAI successfully flawlessly', async () => {
              const { parseJobListings } = require('../../services/aiService');
              const { dbAsync } = require('../../db');
              await dbAsync.run("UPDATE ProviderConfigs SET is_active = 1 WHERE provider_id = 'openai'");

              const mockResponse = { choices: [{ message: { content: JSON.stringify({ jobs: [{ role_title: 'Engineer' }] }) } }] };
              axios.post.mockResolvedValueOnce({ data: mockResponse });

              const res = await parseJobListings('Raw string list flaws flaws');
              expect(res).toHaveLength(1);
              expect(res[0].role_title).toBe('Engineer');
         });

         it('should parse with Gemini successfully flawless', async () => {
              const { parseJobListings } = require('../../services/aiService');
              const { dbAsync } = require('../../db');
              await dbAsync.run("INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active) VALUES ('gemini', '', 'gemini-1.5-pro', 0)");
              await dbAsync.run("UPDATE ProviderConfigs SET is_active = 0");
              await dbAsync.run("UPDATE ProviderConfigs SET api_key = 'test-key', is_active = 1 WHERE provider_id = 'gemini'");

              const mockResponse = { candidates: [{ content: { parts: [{ text: JSON.stringify({ jobs: [{ role_title: 'Gemini Engineer' }] }) }] } }] };
              axios.post.mockResolvedValueOnce({ data: mockResponse });

              const res = await parseJobListings('Raw string list flaws flaws', 'gemini-1.5-pro');
              expect(res).toHaveLength(1);
              expect(res[0].role_title).toBe('Gemini Engineer');
         });
    });

    describe('matchCvWithJob', () => {
         it('should return 0 on catch block failures flawlessly flawless', async () => {
              const { matchCvWithJob } = require('../../services/aiService');
              axios.post.mockRejectedValueOnce(new Error('Network Down'));
              const res = await matchCvWithJob({ id: 1 }, { id: 2 });
              expect(res.match_score).toBe(0);
         });

         it('should match with Ollama successfully flawlessly', async () => {
              const { matchCvWithJob } = require('../../services/aiService');
              const { dbAsync } = require('../../db');
              await dbAsync.run("UPDATE ProviderConfigs SET is_active = 1 WHERE provider_id = 'ollama'");

              const mockResponse = { match_score: 85, matching_tags: ['JS'], summary_analysis: 'Good' };
              axios.post.mockResolvedValueOnce({ data: { response: JSON.stringify(mockResponse) } });

              const res = await matchCvWithJob({ id: 1 }, { id: 2 });
              expect(res.match_score).toBe(85);
         });

         it('should match with Gemini successfully flawlessly', async () => {
              const { matchCvWithJob } = require('../../services/aiService');
              const { dbAsync } = require('../../db');
              await dbAsync.run("INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active) VALUES ('gemini', '', 'gemini-1.5-pro', 0)");
              await dbAsync.run("UPDATE ProviderConfigs SET is_active = 0");
              await dbAsync.run("UPDATE ProviderConfigs SET api_key = 'test-key', is_active = 1 WHERE provider_id = 'gemini'");

              const mockResponse = { match_score: 90, matching_tags: ['Python'], summary_analysis: 'Great' };
              const mockGemini = {
                  data: {
                      candidates: [{ content: { parts: [{ text: JSON.stringify(mockResponse) }] } }]
                  }
              };
              axios.post.mockResolvedValueOnce(mockGemini);

              const res = await matchCvWithJob({ id: 1 }, { id: 2 }, 'gemini-1.5-pro');
              expect(res.match_score).toBe(90);
         });
    });
});
