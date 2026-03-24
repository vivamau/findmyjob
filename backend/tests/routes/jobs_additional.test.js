const request = require('supertest');
const app = require('../../app');

describe('Job Routes - Additional Tests', () => {
    describe('GET /api/jobs', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'all').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app).get('/api/jobs');
            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/jobs', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'run').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app)
                .post('/api/jobs')
                .send({
                    role_title: 'Test',
                    company_name: 'Test Co',
                    location: 'Remote',
                    description: 'Test',
                    source_id: 1
                });
            
            expect(res.status).toBe(500);
        });
    });

    describe('DELETE /api/jobs/:id', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'run').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app).delete('/api/jobs/999');
            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/jobs/scrape', () => {
        it('should return 500 on db error flawlessly', async () => {
            const { dbAsync } = require('../../db');
            jest.spyOn(dbAsync, 'all').mockRejectedValueOnce(new Error('DB error'));

            const res = await request(app).post('/api/jobs/scrape');
            expect(res.status).toBe(500);
        });
    });
});
