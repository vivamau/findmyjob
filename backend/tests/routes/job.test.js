const request = require('supertest');
const app = require('../../app');

jest.mock('../../db', () => ({
    dbAsync: {
        all: jest.fn(),
        run: jest.fn(),
        get: jest.fn()
    }
}));
const { dbAsync } = require('../../db');

describe('Job Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/jobs', () => {
        it('should return list of jobs flawlessly', async () => {
             dbAsync.all.mockResolvedValueOnce([{ id: 1, role_title: 'Engineer' }]);
             const res = await request(app).get('/api/jobs');
             expect(res.status).toBe(200);
             expect(res.body).toHaveLength(1);
        });

        it('should return list of jobs for resume_id flawlessly', async () => {
             dbAsync.all.mockResolvedValueOnce([{ id: 1, role_title: 'Engineer', match_score: 90 }]);
             const res = await request(app).get('/api/jobs?resume_id=1');
             expect(res.status).toBe(200);
             expect(res.body).toHaveLength(1);
             expect(res.body[0].match_score).toBe(90);
        });

        it('should return 500 on db error flawlessly', async () => {
             dbAsync.all.mockRejectedValueOnce(new Error('DB failure'));
             const res = await request(app).get('/api/jobs');
             expect(res.status).toBe(500);
        });
    });
});
