const request = require('supertest');
const app = require('../../app');
const runMigrations = require('../../scripts/run_migrations');

// Mock aiService
jest.mock('../../services/aiService', () => ({
    listModels: jest.fn(),
    parseCvWithModel: jest.fn(),
    getProviderConfigs: jest.fn(),
    updateProviderConfig: jest.fn(),
    getPrompts: jest.fn(),
    updatePrompt: jest.fn(),
    matchCvWithJob: jest.fn()
}));

const { listModels, parseCvWithModel, getProviderConfigs, updateProviderConfig, getPrompts, updatePrompt, matchCvWithJob } = require('../../services/aiService');

jest.mock('../../db', () => ({
    dbAsync: {
        get: jest.fn(),
        all: jest.fn(),
        run: jest.fn()
    }
}));
const { dbAsync } = require('../../db');

describe('AI Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/ai/models', () => {
        it('should return 200 and list of models', async () => {
            listModels.mockResolvedValueOnce(['llama3', 'mistral']);

            const res = await request(app).get('/api/ai/models');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(['llama3', 'mistral']);
        });

        it('should return 500 on internal failure', async () => {
             listModels.mockRejectedValueOnce(new Error('Internal crash node flaws flaws'));
             const res = await request(app).get('/api/ai/models');
             expect(res.status).toBe(500);
        });
    });

    describe('POST /api/ai/match', () => {
        it('should return 400 if resume_id or job_id is missing', async () => {
            const res = await request(app).post('/api/ai/match').send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('resume_id and job_id are required');
        });

        it('should return 200 and match result on success', async () => {
            const { matchCvWithJob } = require('../../services/aiService');
            
            dbAsync.get
                .mockResolvedValueOnce(null) // cached match check
                .mockResolvedValueOnce({ id: 1, title: 'Resume' }) // CV
                .mockResolvedValueOnce({ id: 2, role_title: 'Job' }); // Job

            dbAsync.all
                .mockResolvedValueOnce([]) // Experiences
                .mockResolvedValueOnce([]) // Educations
                .mockResolvedValueOnce([]); // Languages

            matchCvWithJob.mockResolvedValueOnce({
                match_score: 90,
                matching_tags: ['JS'],
                summary_analysis: 'Great fit'
            });

            const res = await request(app)
                .post('/api/ai/match')
                .send({ resume_id: 1, job_id: 2 });

            expect(res.status).toBe(200);
            expect(res.body.match_score).toBe(90);
            expect(res.body.matching_tags).toEqual(['JS']);
        });
    });

    describe('GET /api/ai/providers', () => {
        it('should return 200 and list of provider configs', async () => {
             getProviderConfigs.mockResolvedValueOnce([{ provider_id: 'ollama' }]);
             
             const res = await request(app).get('/api/ai/providers');
             expect(res.status).toBe(200);
             expect(Array.isArray(res.body)).toBe(true);
        });

        it('should return 500 on internal failure too', async () => {
             getProviderConfigs.mockRejectedValueOnce(new Error('Internal configs crash'));
             const res = await request(app).get('/api/ai/providers');
             expect(res.status).toBe(500);
        });
    });

    describe('PUT /api/ai/providers/:id', () => {
        it('should update provider config and return 200', async () => {
             updateProviderConfig.mockResolvedValueOnce({});

             const res = await request(app)
                .put('/api/ai/providers/openai')
                .send({ api_key: 'test', default_model: 'gpt-4', is_active: 1 });
                
             expect(res.status).toBe(200);
             expect(res.body.message).toBe('Provider updated successfully');
        });
    });
    describe('GET /api/ai/prompts', () => {
        it('should return 200 and list of prompts', async () => {
             getPrompts.mockResolvedValueOnce([{ key: 'test', prompt_text: 'Hello' }]);
             
             const res = await request(app).get('/api/ai/prompts');
             expect(res.status).toBe(200);
             expect(res.body).toEqual([{ key: 'test', prompt_text: 'Hello' }]);
        });
    });

    describe('PUT /api/ai/prompts/:key', () => {
        it('should update prompt and return 200', async () => {
             updatePrompt.mockResolvedValueOnce({});

             const res = await request(app)
                .put('/api/ai/prompts/test')
                .send({ prompt_text: 'New Prompt' });
                
             expect(res.status).toBe(200);
             expect(res.body.message).toBe('Prompt updated successfully');
             expect(updatePrompt).toHaveBeenCalledWith('test', 'New Prompt');
        });
    });
});
