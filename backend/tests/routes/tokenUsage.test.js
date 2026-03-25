const request = require('supertest');
const app = require('../../app');

jest.mock('../../db', () => ({
    dbAsync: {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn()
    }
}));

const { dbAsync } = require('../../db');

describe('Token Usage Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/tokens', () => {
        it('should return 200 and list of token usage records', async () => {
            const mockTokenUsage = [
                {
                    id: 1,
                    model_used: 'gemini-2.0-flash',
                    operation_type: 'parseJobListings',
                    tokens_in: 100,
                    tokens_out: 200,
                    started_at: '2026-03-25T10:00:00.000Z',
                    ended_at: '2026-03-25T10:00:05.000Z'
                },
                {
                    id: 2,
                    model_used: 'gemini-2.0-flash',
                    operation_type: 'parseCv',
                    tokens_in: 150,
                    tokens_out: 300,
                    started_at: '2026-03-25T11:00:00.000Z',
                    ended_at: '2026-03-25T11:00:10.000Z'
                }
            ];

            dbAsync.all.mockResolvedValueOnce(mockTokenUsage);

            const res = await request(app).get('/api/tokens');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockTokenUsage);
            expect(dbAsync.all).toHaveBeenCalledWith(
                'SELECT * FROM TokenUsage ORDER BY started_at DESC LIMIT ? OFFSET ?',
                [100, 0]
            );
        });

        it('should return 500 on internal failure', async () => {
            dbAsync.all.mockRejectedValueOnce(new Error('Database error'));

            const res = await request(app).get('/api/tokens');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });

    describe('GET /api/tokens/summary', () => {
        it('should return 200 and token usage summary', async () => {
            const mockSummary = [
                {
                    model_used: 'gemini-2.0-flash',
                    operation_type: 'parseJobListings',
                    total_tokens_in: 500,
                    total_tokens_out: 1000,
                    total_operations: 5
                },
                {
                    model_used: 'gemini-2.0-flash',
                    operation_type: 'parseCv',
                    total_tokens_in: 300,
                    total_tokens_out: 600,
                    total_operations: 3
                }
            ];

            dbAsync.all.mockResolvedValueOnce(mockSummary);

            const res = await request(app).get('/api/tokens/summary');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockSummary);
            expect(dbAsync.all).toHaveBeenCalled();
        });

        it('should return 500 on internal failure', async () => {
            dbAsync.all.mockRejectedValueOnce(new Error('Database error'));

            const res = await request(app).get('/api/tokens/summary');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Database error' });
        });
    });
});
