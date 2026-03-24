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

        it('should return 400 if only resume_id is missing', async () => {
            const res = await request(app).post('/api/ai/match').send({ job_id: 2 });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('resume_id and job_id are required');
        });

        it('should return 400 if only job_id is missing', async () => {
            const res = await request(app).post('/api/ai/match').send({ resume_id: 1 });
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

        it('should return cached match result when available and not forced flawlessly', async () => {
            dbAsync.get.mockResolvedValueOnce({
                match_score: 85,
                matching_tags: JSON.stringify(['React', 'Node']),
                summary_analysis: 'Good match'
            });

            const res = await request(app)
                .post('/api/ai/match')
                .send({ resume_id: 1, job_id: 2 });

            expect(res.status).toBe(200);
            expect(res.body.match_score).toBe(85);
            expect(res.body.matching_tags).toEqual(['React', 'Node']);
        });

        it('should force re-match when force parameter is true flawlessly', async () => {
            const { matchCvWithJob } = require('../../services/aiService');
            
            dbAsync.get
                .mockResolvedValueOnce({ match_score: 70 }) // cached match
                .mockResolvedValueOnce({ id: 1, title: 'Resume' }) // CV
                .mockResolvedValueOnce({ id: 2, role_title: 'Job' }); // Job

            dbAsync.all
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            matchCvWithJob.mockResolvedValueOnce({
                match_score: 95,
                matching_tags: ['Python', 'Django'],
                summary_analysis: 'Excellent fit'
            });

            const res = await request(app)
                .post('/api/ai/match')
                .send({ resume_id: 1, job_id: 2, force: true });

            expect(res.status).toBe(200);
            expect(res.body.match_score).toBe(95);
        });

        it('should return 404 when CV not found flawlessly', async () => {
            dbAsync.get
                .mockResolvedValueOnce(null) // cached match check
                .mockResolvedValueOnce(null); // CV not found

            const res = await request(app)
                .post('/api/ai/match')
                .send({ resume_id: 999, job_id: 2 });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('CV or Job not found');
        });

        it('should return 404 when Job not found flawlessly', async () => {
            dbAsync.get
                .mockResolvedValueOnce(null) // cached match check
                .mockResolvedValueOnce({ id: 1, title: 'Resume' }) // CV
                .mockResolvedValueOnce(null); // Job not found

            dbAsync.all
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const res = await request(app)
                .post('/api/ai/match')
                .send({ resume_id: 1, job_id: 999 });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('CV or Job not found');
        });

        it('should return 500 on internal error flawlessly', async () => {
            dbAsync.get.mockRejectedValueOnce(new Error('Database error'));

            const res = await request(app)
                .post('/api/ai/match')
                .send({ resume_id: 1, job_id: 2 });

            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/ai/match-batch', () => {
        it('should return 400 if resume_id is missing flawlessly', async () => {
            const res = await request(app)
                .post('/api/ai/match-batch')
                .send({ job_ids: [1, 2, 3] });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('resume_id and job_ids array are required');
        });

        it('should return 400 if job_ids is missing flawlessly', async () => {
            const res = await request(app)
                .post('/api/ai/match-batch')
                .send({ resume_id: 1 });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('resume_id and job_ids array are required');
        });

        it('should return 400 if job_ids is not an array flawlessly', async () => {
            const res = await request(app)
                .post('/api/ai/match-batch')
                .send({ resume_id: 1, job_ids: 'not-an-array' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('resume_id and job_ids array are required');
        });

        it('should return 404 when CV not found flawlessly', async () => {
            dbAsync.get.mockResolvedValueOnce(null);

            const res = await request(app)
                .post('/api/ai/match-batch')
                .send({ resume_id: 999, job_ids: [1, 2, 3] });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('CV not found');
        });

        it('should return batch match results flawlessly', async () => {
            const { matchCvWithJob } = require('../../services/aiService');
            
            dbAsync.get
                .mockResolvedValueOnce({ id: 1, title: 'Resume' }) // CV
                .mockResolvedValueOnce(null) // job 1 cached check
                .mockResolvedValueOnce({ id: 1, role_title: 'Job 1' }) // job 1
                .mockResolvedValueOnce(null) // job 2 cached check
                .mockResolvedValueOnce({ id: 2, role_title: 'Job 2' }); // job 2

            dbAsync.all
                .mockResolvedValueOnce([]) // Experiences
                .mockResolvedValueOnce([]) // Educations
                .mockResolvedValueOnce([]); // Languages

            matchCvWithJob
                .mockResolvedValueOnce({
                    match_score: 85,
                    matching_tags: ['JS'],
                    summary_analysis: 'Good'
                })
                .mockResolvedValueOnce({
                    match_score: 90,
                    matching_tags: ['React'],
                    summary_analysis: 'Great'
                });

            const res = await request(app)
                .post('/api/ai/match-batch')
                .send({ resume_id: 1, job_ids: [1, 2] });

            expect(res.status).toBe(200);
            expect(res.body.results['1'].match_score).toBe(85);
            expect(res.body.results['2'].match_score).toBe(90);
        });

        it('should return cached results when available flawlessly', async () => {
            dbAsync.get
                .mockResolvedValueOnce({ id: 1, title: 'Resume' }) // CV
                .mockResolvedValueOnce({
                    match_score: 80,
                    matching_tags: JSON.stringify(['Node']),
                    summary_analysis: 'Decent'
                }); // job 1 cached

            const res = await request(app)
                .post('/api/ai/match-batch')
                .send({ resume_id: 1, job_ids: [1] });

            expect(res.status).toBe(200);
            expect(res.body.results['1'].match_score).toBe(80);
        });

        it('should skip jobs that are not found flawlessly', async () => {
            const { matchCvWithJob } = require('../../services/aiService');
            
            dbAsync.get
                .mockResolvedValueOnce({ id: 1, title: 'Resume' }) // CV
                .mockResolvedValueOnce(null) // job 1 cached check
                .mockResolvedValueOnce(null); // job 1 not found

            dbAsync.all
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const res = await request(app)
                .post('/api/ai/match-batch')
                .send({ resume_id: 1, job_ids: [1] });

            expect(res.status).toBe(200);
            expect(Object.keys(res.body.results)).toHaveLength(0);
        });

        it('should handle errors during batch matching flawlessly', async () => {
            const { matchCvWithJob } = require('../../services/aiService');
            
            dbAsync.get
                .mockResolvedValueOnce({ id: 1, title: 'Resume' }) // CV
                .mockResolvedValueOnce(null) // job 1 cached check
                .mockRejectedValueOnce(new Error('DB error')); // job 1 fetch error

            dbAsync.all
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const res = await request(app)
                .post('/api/ai/match-batch')
                .send({ resume_id: 1, job_ids: [1] });

            expect(res.status).toBe(200);
            expect(Object.keys(res.body.results)).toHaveLength(0);
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
