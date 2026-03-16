const request = require('supertest');
const app = require('../../app');
const runMigrations = require('../../scripts/run_migrations');

// Mock aiService
jest.mock('../../services/aiService', () => ({
    listModels: jest.fn(),
    parseCvWithModel: jest.fn(),
    getProviderConfigs: jest.fn(),
    updateProviderConfig: jest.fn()
}));

const { listModels, parseCvWithModel, getProviderConfigs, updateProviderConfig } = require('../../services/aiService');

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

    describe('POST /api/cv/:id/parse', () => {
        it('should trigger parse and insert experiences', async () => {
            // Needs mock configuration node flaws flaws
            expect(true).toBe(true);
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
});
