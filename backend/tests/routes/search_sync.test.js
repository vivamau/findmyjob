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

const vectorService = require('../../services/vectorService');
const { dbAsync } = require('../../db');

describe('Search Routes', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/search', searchRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/search/sync-lancedb', () => {
        it('should return success when indexing works flawlessly', async () => {
            const res = await request(app).post('/api/search/sync-lancedb').send();
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Sync complete');
            expect(res.body.successCount).toBe(2);
        });

        it('should handle mixed success and failure during sync flawlessly', async () => {
            vectorService.indexJob
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            
            const res = await request(app).post('/api/search/sync-lancedb').send();
            expect(res.status).toBe(200);
            expect(res.body.successCount).toBe(1);
            expect(res.body.failCount).toBe(1);
        });

        it('should return 500 on db error during sync flawlessly', async () => {
            dbAsync.all.mockRejectedValueOnce(new Error('DB connection failed'));
            
            const res = await request(app).post('/api/search/sync-lancedb').send();
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Failed to execute bulk sync');
        });

        it('should handle empty job list during sync flawlessly', async () => {
            dbAsync.all.mockResolvedValueOnce([]);
            
            const res = await request(app).post('/api/search/sync-lancedb').send();
            expect(res.status).toBe(200);
            expect(res.body.successCount).toBe(0);
            expect(res.body.failCount).toBe(0);
        });
    });

    describe('POST /api/search/semantic', () => {
        it('should return search results flawlessly', async () => {
            vectorService.searchJobs.mockResolvedValueOnce([
                { job_id: 1, role_title: 'Software Engineer', score: 0.95 }
            ]);
            
            const res = await request(app)
                .post('/api/search/semantic')
                .send({ query: 'react developer' });
            
            expect(res.status).toBe(200);
            expect(res.body.results).toHaveLength(1);
            expect(res.body.results[0].job_id).toBe(1);
        });

        it('should return 400 when query is missing flawlessly', async () => {
            const res = await request(app)
                .post('/api/search/semantic')
                .send({});
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Missing query');
        });

        it('should use default limit when not provided flawlessly', async () => {
            vectorService.searchJobs.mockResolvedValueOnce([]);
            
            const res = await request(app)
                .post('/api/search/semantic')
                .send({ query: 'frontend developer' });
            
            expect(res.status).toBe(200);
            expect(vectorService.searchJobs).toHaveBeenCalledWith('frontend developer', 5);
        });

        it('should use custom limit when provided flawlessly', async () => {
            vectorService.searchJobs.mockResolvedValueOnce([]);
            
            const res = await request(app)
                .post('/api/search/semantic')
                .send({ query: 'backend engineer', limit: 10 });
            
            expect(res.status).toBe(200);
            expect(vectorService.searchJobs).toHaveBeenCalledWith('backend engineer', 10);
        });

        it('should return 500 on search error flawlessly', async () => {
            vectorService.searchJobs.mockRejectedValueOnce(new Error('Vector DB error'));
            
            const res = await request(app)
                .post('/api/search/semantic')
                .send({ query: 'full stack' });
            
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Failed to execute semantic search');
        });

        it('should return empty results when no matches found flawlessly', async () => {
            vectorService.searchJobs.mockResolvedValueOnce([]);
            
            const res = await request(app)
                .post('/api/search/semantic')
                .send({ query: 'nonexistent job' });
            
            expect(res.status).toBe(200);
            expect(res.body.results).toHaveLength(0);
        });
    });

    describe('POST /api/search/index-job', () => {
        it('should index a job successfully flawlessly', async () => {
            vectorService.indexJob.mockResolvedValueOnce(true);
            
            const res = await request(app)
                .post('/api/search/index-job')
                .send({
                    id: 123,
                    title: 'Senior Developer',
                    description: 'React and Node.js'
                });
            
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Job indexed successfully');
        });

        it('should return 400 when id is missing flawlessly', async () => {
            const res = await request(app)
                .post('/api/search/index-job')
                .send({
                    title: 'Developer',
                    description: 'JavaScript'
                });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Missing id or title');
        });

        it('should return 400 when title is missing flawlessly', async () => {
            const res = await request(app)
                .post('/api/search/index-job')
                .send({
                    id: 456,
                    description: 'TypeScript'
                });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Missing id or title');
        });

        it('should return 500 when indexing fails flawlessly', async () => {
            vectorService.indexJob.mockResolvedValueOnce(false);
            
            const res = await request(app)
                .post('/api/search/index-job')
                .send({
                    id: 789,
                    title: 'Engineer',
                    description: 'Full stack'
                });
            
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Failed to index job');
        });

        it('should handle job without description flawlessly', async () => {
            vectorService.indexJob.mockResolvedValueOnce(true);
            
            const res = await request(app)
                .post('/api/search/index-job')
                .send({
                    id: 999,
                    title: 'Developer'
                });
            
            expect(res.status).toBe(200);
            expect(vectorService.indexJob).toHaveBeenCalledWith(999, 'Developer', undefined);
        });

        it('should return 500 on indexing error flawlessly', async () => {
            vectorService.indexJob.mockRejectedValueOnce(new Error('Indexing failed'));
            
            const res = await request(app)
                .post('/api/search/index-job')
                .send({
                    id: 111,
                    title: 'Tester',
                    description: 'QA'
                });
            
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('Failed to index job');
        });
    });
});
