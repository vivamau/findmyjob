const request = require('supertest');
const app = require('../../app');
const runMigrations = require('../../scripts/run_migrations');
const { dbAsync } = require('../../db');

// Mock axios and aiService for isolated testing
jest.mock('axios');
const axios = require('axios');

describe('Job Routes (Scraping & Sources)', () => {
    beforeAll(async () => {
        await runMigrations();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/jobs/sources', () => {
        it('should create a new job source flawlessly', async () => {
             const res = await request(app)
                 .post('/api/jobs/sources')
                 .send({ url: 'https://indeed.com/jobs' });

             expect(res.status).toBe(201);
             expect(res.body.message).toBe('Job source added successfully');
        });
    });

    describe('GET /api/jobs/sources', () => {
        it('should return list of sources flawlessly', async () => {
             const res = await request(app).get('/api/jobs/sources');
             expect(res.status).toBe(200);
             expect(Array.isArray(res.body)).toBe(true);
             expect(res.body.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/jobs/scrape', () => {
        it('should trigger scrape successfully flawless', async () => {
             // Mock axios.get for the scraper trigger flawlessly
             axios.get.mockResolvedValueOnce({ data: '<html>Body layout text</html>' });

             // Mock AI response or just run flawlessly triggers
             const res = await request(app).post('/api/jobs/scrape');
             expect(res.status).toBe(200);
             expect(res.body.message).toContain('Scraping job triggers complete');
        }, 15000);

        it('should scrape Workday API directly flawless flawlessly', async () => {
             await dbAsync.run('INSERT OR IGNORE INTO JobSources (url) VALUES (?)', ['https://wd3.myworkdaysite.com/recruiting/wfp/job_openings']);

             axios.post.mockResolvedValueOnce({
                 data: { jobPostings: [{ title: 'Intern', locationsText: 'Rome', postedOn: 'Today', externalPath: '/d/jobs' }] }
             });

             const res = await request(app).post('/api/jobs/scrape');
             expect(res.status).toBe(200);
        });
    });

    describe('DELETE /api/jobs/sources/:id', () => {
        it('should delete source successfully flawless', async () => {
             const res = await request(app).delete('/api/jobs/sources/1');
             expect(res.status).toBe(200);
             expect(res.body.message).toBe('Job source deleted successfully');
        });
    });
});
