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
        }, 30000);
    });

    describe('DELETE /api/jobs/sources/:id', () => {
        it('should delete source successfully flawless', async () => {
             const res = await request(app).delete('/api/jobs/sources/1');
             expect(res.status).toBe(200);
             expect(res.body.message).toBe('Job source deleted successfully');
        });
    });

    describe('PUT /api/jobs/sources/:id', () => {
        it('should update source metadata flawlessly', async () => {
             // Create another one just to be perfectly sure absolute flawlessly flaws
             await request(app).post('/api/jobs/sources').send({ url: 'https://initial-url.com', scrape_interval_days: 1 });
             const list = await request(app).get('/api/jobs/sources');
             const targetId = list.body[0].id;

             const res = await request(app)
                 .put(`/api/jobs/sources/${targetId}`)
                 .send({ url: 'https://updated-link.com', scrape_interval_days: 5 });

             expect(res.status).toBe(200);
             expect(res.body.message).toBe('Job source updated successfully');

             const updated = await dbAsync.get('SELECT * FROM JobSources WHERE id = ?', [targetId]);
             expect(updated.url).toBe('https://updated-link.com');
              expect(updated.scrape_interval_days).toBe(5);
        });
    });

    describe('POST /api/jobs/sources/:id/scrape', () => {
        it('should scrape a single job source successfully', async () => {
            // Create a job source to test
            await dbAsync.run(
                'INSERT INTO JobSources (url, name, description, scrape_interval_days, is_active) VALUES (?, ?, ?, ?, ?)',
                ['https://example.com/jobs', 'Test Source', 'Test Description', 1, 1]
            );

            // Mock axios.get for the scraper
            axios.get.mockResolvedValueOnce({ data: '<html>Job listings here</html>' });

            const sources = await dbAsync.all('SELECT * FROM JobSources WHERE url = ?', ['https://example.com/jobs']);
            const sourceId = sources[0].id;

            const res = await request(app).post(`/api/jobs/sources/${sourceId}/scrape`);
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Scraping completed successfully');
        }, 15000);

        it('should return 404 if job source not found', async () => {
            const res = await request(app).post('/api/jobs/sources/99999/scrape');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Job source not found');
        });

        it('should skip scraping if interval not reached', async () => {
            // Create a job source with recent last_scraped_at
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
            
            await dbAsync.run(
                'INSERT INTO JobSources (url, name, description, scrape_interval_days, last_scraped_at, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                ['https://example.com/jobs2', 'Test Source 2', 'Test Description', 2, oneHourAgo.toISOString(), 1]
            );

            const sources = await dbAsync.all('SELECT * FROM JobSources WHERE url = ?', ['https://example.com/jobs2']);
            const sourceId = sources[0].id;

            const res = await request(app).post(`/api/jobs/sources/${sourceId}/scrape`);
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Scrape interval not reached yet');
        });

        it('should scrape Workday source successfully', async () => {
            // Create a Workday source
            await dbAsync.run(
                'INSERT INTO JobSources (url, name, description, scrape_interval_days, is_active) VALUES (?, ?, ?, ?, ?)',
                ['https://wd3.myworkdaysite.com/recruiting/testsite/job_openings', 'Workday Test', 'Workday Description', 1, 1]
            );

            // Mock axios.post for Workday API
            axios.post.mockResolvedValueOnce({
                data: { jobPostings: [{ title: 'Software Engineer', locationsText: 'Remote', postedOn: '2024-01-01', externalPath: '/job/123' }] }
            });

            const sources = await dbAsync.all('SELECT * FROM JobSources WHERE url LIKE ?', ['%workdaysite.com%']);
            const sourceId = sources[0].id;

            const res = await request(app).post(`/api/jobs/sources/${sourceId}/scrape`);
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Scraping completed successfully');
        }, 15000);
    });
});
