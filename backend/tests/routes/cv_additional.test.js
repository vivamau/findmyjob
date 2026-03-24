const request = require('supertest');
const app = require('../../app');

// Mock aiService
jest.mock('../../services/aiService', () => ({
    parseCvWithModel: jest.fn().mockResolvedValue({
        experiences: [{ company_name: 'Fake Co', role_title: 'Developer' }],
        educations: [],
        languages: []
    })
}));

describe('CV Routes - Additional Tests', () => {
    describe('GET /api/cv', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'all').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .get('/api/cv')
                .query({ user_id: 1 });

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('GET /api/cv/:id/experiences', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'get').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .get('/api/cv/1/experiences');

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('GET /api/cv/:id/educations', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'get').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .get('/api/cv/1/educations');

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('PUT /api/cv/experiences/:id', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'run').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .put('/api/cv/experiences/1')
                .send({ role_title: 'Test' });

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('PUT /api/cv/educations/:id', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'run').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .put('/api/cv/educations/1')
                .send({ degree_title: 'Test' });

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('PUT /api/cv/languages/:id', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'run').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .put('/api/cv/languages/1')
                .send({ proficiency_level: 'Test' });

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('PUT /api/cv/:id', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'run').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .put('/api/cv/1')
                .send({ title: 'Test' });

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('GET /api/cv/:id/languages', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'get').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .get('/api/cv/1/languages');

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('POST /api/cv/:id/parse', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'get').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .post('/api/cv/1/parse')
                .send({ model: 'llama3' });

            expect(res.statusCode).toEqual(500);
        });
    });

    describe('DELETE /api/cv/:id', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'run').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .delete('/api/cv/1');

            expect(res.statusCode).toEqual(500);
        });
    });
});
