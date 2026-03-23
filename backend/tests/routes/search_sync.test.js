const request = require('supertest');
const express = require('express');
const searchRoutes = require('../../routes/searchRoutes');

// Mock vectorService
jest.mock('../../services/vectorService', () => ({
    indexJob: jest.fn().mockResolvedValue(true),
    searchJobs: jest.fn()
}));

// Mock db
jest.mock('../../db', () => ({
    dbAsync: {
        all: jest.fn().mockResolvedValue([
            { id: 1, role_title: 'Software Engineer', description: 'React Node' },
            { id: 2, role_title: 'Product Manager', description: 'Agile' }
        ])
    }
}));

describe('Search Routes - Sync LanceDB', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/search', searchRoutes);
    });

    it('POST /api/search/sync-lancedb should return success when indexing works', async () => {
        const res = await request(app).post('/api/search/sync-lancedb').send();
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Sync complete');
        expect(res.body.successCount).toBe(2);
    });
});
