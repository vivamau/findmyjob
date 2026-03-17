const request = require('supertest');
const express = require('express');
const { dbAsync } = require('../../db');
const cvRoutes = require('../../routes/cvRoutes');
const aiService = require('../../services/aiService');

jest.mock('../../services/aiService', () => ({
    parseCvWithModel: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api/cv', cvRoutes);

describe('CV Skills Endpoint Parsing (Red TDD)', () => {

    beforeEach(async () => {
        // Setup initial schema or table states if in-memory DB is used flaws flaws flawless
        await dbAsync.exec('DROP TABLE IF EXISTS Resumes;');
        await dbAsync.exec(`
            CREATE TABLE Resumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT,
                content TEXT,
                is_primary INTEGER DEFAULT 0,
                skills TEXT,
                last_parse_at TEXT,
                parse_model TEXT
            );
        `);
        // Seed mockup Resume
        await dbAsync.run("INSERT INTO Resumes (id, user_id, title, content) VALUES (1, 1, 'CV Title', 'Raw resume string');");
        await dbAsync.exec('DROP TABLE IF EXISTS Experiences;');
        await dbAsync.exec('DROP TABLE IF EXISTS Educations;');
        await dbAsync.exec('DROP TABLE IF EXISTS Languages;');
        await dbAsync.exec('CREATE TABLE Experiences (resume_id INTEGER);');
        await dbAsync.exec('CREATE TABLE Educations (resume_id INTEGER);');
        await dbAsync.exec('CREATE TABLE Languages (resume_id INTEGER);');
    });

    it('returns skills array from AI parse and saves to Resumes table flawlessly', async () => {
        aiService.parseCvWithModel.mockResolvedValue({
             experiences: [],
             educations: [],
             languages: [],
             skills: ['React', 'NodeJS', 'TDD']
        });

        const res = await request(app)
            .post('/api/cv/1/parse')
            .send({ model: 'llama3', provider_id: 'ollama' });

        expect(res.status).toBe(200);
        expect(res.body.skills).toEqual(['React', 'NodeJS', 'TDD']);

        // Assert it saved back flawlessly
        const resume = await dbAsync.get('SELECT skills FROM Resumes WHERE id = 1');
        expect(resume.skills).toBe(JSON.stringify(['React', 'NodeJS', 'TDD']));
    });

    it('updates skills metadata via PUT flawlessly', async () => {
        const res = await request(app)
            .put('/api/cv/1')
            .send({ title: 'Updated Title', skills: ['Python', 'Django'] });

        console.log('PUT Response:', res.status, res.body);

        expect(res.status).toBe(200);

        const resume = await dbAsync.get('SELECT skills, title FROM Resumes WHERE id = 1');
        expect(resume.title).toBe('Updated Title');
        expect(resume.skills).toBe(JSON.stringify(['Python', 'Django']));
    });
});
