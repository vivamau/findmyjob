const request = require('supertest');
const app = require('../../app');
const path = require('path');
const fs = require('fs');

// Mock aiService
jest.mock('../../services/aiService', () => ({
    parseCvWithModel: jest.fn().mockResolvedValue({
        experiences: [{ company_name: 'Fake Co', role_title: 'Developer' }],
        educations: [],
        languages: []
    })
}));

describe('CV Routes', () => {
    let dummyFilePath;

    beforeAll(async () => {
        const runMigrations = require('../../scripts/run_migrations');
        const seedUserRoles = require('../../scripts/seed_userroles');
        const seedUsers = require('../../scripts/seed_users');

        // Apply migrations
        await runMigrations();
        await seedUserRoles();
        await seedUsers();

        dummyFilePath = path.join(__dirname, 'test_cv.pdf');
        fs.writeFileSync(dummyFilePath, 'Fake PDF content for testing');
    });

    afterAll(() => {
        if (fs.existsSync(dummyFilePath)) {
            fs.unlinkSync(dummyFilePath);
        }
    });

    describe('POST /api/cv/upload', () => {
        it('should upload, parse, and save a CV correctly', async () => {
            const res = await request(app)
                .post('/api/cv/upload')
                // we set title as field, and file as the pdf
                .field('title', 'Test Resume')
                .field('user_id', 1) // mocking user_id since auth isn't there yet
                .attach('file', dummyFilePath);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('message', 'CV uploaded and saved successfully');
        });

        it('should return 400 if file is missing', async () => {
            const res = await request(app)
                .post('/api/cv/upload')
                .field('title', 'Test Resume')
                .field('user_id', 1);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'No file uploaded');
        });
    });

    describe('GET /api/cv', () => {
        it('should return all CVs for the user', async () => {
            const res = await request(app)
                .get('/api/cv')
                .query({ user_id: 1 }); // Mocking user_id query

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBeGreaterThanOrEqual(1); // Since we uploaded one in previous test
            expect(res.body[0]).toHaveProperty('title', 'Test Resume');
        });
    });

    describe('GET /api/cv/:id/experiences', () => {
        it('should return 200 and array of experiences', async () => {
            const res = await request(app)
                .get('/api/cv/1/experiences');

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    describe('GET /api/cv/:id/educations', () => {
        it('should return 200 and array of educations', async () => {
            const res = await request(app)
                .get('/api/cv/1/educations');

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    describe('PUT /api/cv/experiences/:id', () => {
        it('should update an experience record successfully', async () => {
             const res = await request(app)
                 .put('/api/cv/experiences/1')
                 .send({ role_title: 'Senior Engineer' });

             expect(res.statusCode).toEqual(200);
             expect(res.body).toHaveProperty('message', 'Experience updated successfully');
        });
    });

    describe('PUT /api/cv/educations/:id', () => {
        it('should update an education record successfully', async () => {
             const res = await request(app)
                 .put('/api/cv/educations/1')
                 .send({ degree_title: 'MSc' });

             expect(res.statusCode).toEqual(200);
             expect(res.body).toHaveProperty('message', 'Education updated successfully');
        });
    });

    describe('PUT /api/cv/languages/:id', () => {
        it('should update a language record successfully', async () => {
             const res = await request(app)
                 .put('/api/cv/languages/1')
                 .send({ proficiency_level: 'Fluent' });

             expect(res.statusCode).toEqual(200);
             expect(res.body).toHaveProperty('message', 'Language updated successfully');
        });
    });

    describe('PUT /api/cv/:id', () => {
        it('should update CV metadata successfully', async () => {
             const res = await request(app)
                 .put('/api/cv/1')
                 .send({ title: 'Updated CV Title', is_primary: 1 });

             expect(res.statusCode).toEqual(200);
             expect(res.body).toHaveProperty('message', 'CV metadata updated successfully');
        });
    });

    describe('GET /api/cv/:id/languages', () => {
        it('should return 200 and array of languages', async () => {
            const res = await request(app)
                .get('/api/cv/1/languages');

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    describe('POST /api/cv/:id/parse', () => {
        it('should trigger AI parse and return 200 success code', async () => {
             const res = await request(app)
                 .post('/api/cv/1/parse')
                 .send({ model: 'llama3' });

             expect(res.statusCode).toEqual(200);
             expect(res.body).toHaveProperty('message', 'CV parsed and nodes saved successfully');
             expect(Array.isArray(res.body.experiences)).toBeTruthy();
        });
    });

    describe('DELETE /api/cv/:id', () => {
        it('should delete the CV and all cascading child records', async () => {
             // 1. Double check we have items first
             const preCheck = await request(app).get('/api/cv/1/experiences');
             expect(preCheck.body).not.toHaveLength(0);

             // 2. Perform deletion
             const res = await request(app).delete('/api/cv/1');
             expect(res.statusCode).toEqual(200);
             expect(res.body).toHaveProperty('message', 'CV and all related nodes deleted successfully');

             // 3. Verify it is gone
             const postCheckResumes = await request(app).get('/api/cv').query({ user_id: 1 });
             const list = postCheckResumes.body;
             expect(list.find(c => c.id === 1)).toBeUndefined();

             // 4. Verify items cascaded away
             const postCheckExp = await request(app).get('/api/cv/1/experiences');
             expect(postCheckExp.body).toHaveLength(0);
        });
    });
});
