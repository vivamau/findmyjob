const fs = require('fs');
const path = require('path');
const { parseCvFile, saveCvToDb } = require('../../services/cvService');

// Mock db calls for TDD
jest.mock('../../db', () => ({
  dbAsync: {
    run: jest.fn(),
    get: jest.fn()
  }
}));

const { dbAsync } = require('../../db');

describe('CV Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseCvFile', () => {
    it('should extract text from a dummy PDF file (mocked)', async () => {
      // In a real app we'd use pdf-parse or similar, here we mock the extraction process for TDD
      const mockFilePath = path.join(__dirname, 'dummy.pdf');
      fs.writeFileSync(mockFilePath, 'dummy content');

      // Given a file path, it should return some parsed standard text
      // We will define that CV text extraction returns a structured object or string.
      // E.g., returning text
      const result = await parseCvFile(mockFilePath);
      expect(result).toBeDefined();
      expect(typeof result.text).toBe('string');
      
      fs.unlinkSync(mockFilePath);
    });
  });

  describe('saveCvToDb', () => {
    it('should insert a new CV into the Resumes table for a user', async () => {
      const userId = 1;
      const title = 'My Cool CV';
      const content = 'Parsed CV text here';

      // Mock the insert returning a specific row id (the way sqlite3 standard run behaves via our wrapper)
      dbAsync.run.mockResolvedValueOnce({ lastID: 42 });

      const newCvId = await saveCvToDb(userId, title, content);

      expect(newCvId).toBe(42);
      expect(dbAsync.run).toHaveBeenCalledWith(
        'INSERT INTO Resumes (user_id, title, content) VALUES (?, ?, ?)',
        [userId, title, content]
      );
    });

    it('should throw an error if missing required fields', async () => {
      await expect(saveCvToDb(null, 'Title', 'Content')).rejects.toThrow('Missing required fields');
    });
  });

  describe('addExperiences', () => {
    it('should insert multiple experiences into the database', async () => {
        const { addExperiences } = require('../../services/cvService');
        const resumeId = 1;
        const mockExperiences = [
            { company_name: 'Company A', role_title: 'Developer', start_date: '2020', end_date: '2022', description: 'Desc A' },
            { company_name: 'Company B', role_title: 'Manager', start_date: '2022', end_date: '2024', description: 'Desc B' }
        ];

        dbAsync.run.mockResolvedValue({ lastID: 1 });

        await addExperiences(resumeId, mockExperiences);

        expect(dbAsync.run).toHaveBeenCalledTimes(2);
        
        // Verify first call
        expect(dbAsync.run).toHaveBeenNthCalledWith(
            1,
            'INSERT INTO Experiences (resume_id, company_name, role_title, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)',
            [resumeId, 'Company A', 'Developer', '2020', '2022', 'Desc A']
        );

        // Verify second call
        expect(dbAsync.run).toHaveBeenNthCalledWith(
            2,
            'INSERT INTO Experiences (resume_id, company_name, role_title, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)',
            [resumeId, 'Company B', 'Manager', '2022', '2024', 'Desc B']
        );
    });
  });

  describe('parseCvFile - additional scenarios', () => {
      it('should throw error when file not found flawlessly', async () => {
          const { parseCvFile } = require('../../services/cvService');
          await expect(parseCvFile('/nonexistent/file.pdf')).rejects.toThrow('File not found');
      });

      it('should throw error on PDF parse failure flawlessly', async () => {
          const { parseCvFile } = require('../../services/cvService');
          const mockFilePath = path.join(__dirname, 'dummy.pdf');
          fs.writeFileSync(mockFilePath, 'invalid pdf content');

          await expect(parseCvFile(mockFilePath)).rejects.toThrow();

          fs.unlinkSync(mockFilePath);
      });
  });

  describe('addEducations', () => {
      it('should insert multiple educations into database flawlessly', async () => {
          const { addEducations } = require('../../services/cvService');
          const resumeId = 1;
          const mockEducations = [
              { institution_name: 'University A', degree_title: 'BS', start_date: '2018', end_date: '2022', description: 'CS' },
              { institution_name: 'University B', degree_title: 'MS', start_date: '2022', end_date: '2024', description: 'AI' }
          ];

          dbAsync.run.mockResolvedValue({ lastID: 1 });

          await addEducations(resumeId, mockEducations);

          expect(dbAsync.run).toHaveBeenCalledTimes(2);
      });
  });

  describe('addLanguages', () => {
      it('should insert multiple languages into database flawlessly', async () => {
          const { addLanguages } = require('../../services/cvService');
          const resumeId = 1;
          const mockLanguages = [
              { language_name: 'English', proficiency_level: 'Fluent' },
              { language_name: 'Spanish', proficiency_level: 'Intermediate' }
          ];

          dbAsync.run.mockResolvedValue({ lastID: 1 });

          await addLanguages(resumeId, mockLanguages);

          expect(dbAsync.run).toHaveBeenCalledTimes(2);
      });
  });

  describe('updateExperience', () => {
      it('should update experience record flawlessly', async () => {
          const { updateExperience } = require('../../services/cvService');
          const expId = 1;
          const updateData = {
              company_name: 'Updated Company',
              role_title: 'Senior Developer',
              start_date: '2020',
              end_date: '2024',
              description: 'Updated description'
          };

          dbAsync.run.mockResolvedValue({ lastID: 1 });

          await updateExperience(expId, updateData);

          expect(dbAsync.run).toHaveBeenCalledWith(
              'UPDATE Experiences SET company_name = ?, role_title = ?, start_date = ?, end_date = ?, description = ? WHERE id = ?',
              ['Updated Company', 'Senior Developer', '2020', '2024', 'Updated description', 1]
          );
      });
  });

  describe('updateEducation', () => {
      it('should update education record flawlessly', async () => {
          const { updateEducation } = require('../../services/cvService');
          const eduId = 1;
          const updateData = {
              institution_name: 'Updated University',
              degree_title: 'PhD',
              start_date: '2024',
              end_date: '2026',
              description: 'Updated CS'
          };

          dbAsync.run.mockResolvedValue({ lastID: 1 });

          await updateEducation(eduId, updateData);

          expect(dbAsync.run).toHaveBeenCalledWith(
              'UPDATE Educations SET institution_name = ?, degree_title = ?, start_date = ?, end_date = ?, description = ? WHERE id = ?',
              ['Updated University', 'PhD', '2024', '2026', 'Updated CS', 1]
          );
      });
  });

  describe('updateLanguage', () => {
      it('should update language record flawlessly', async () => {
          const { updateLanguage } = require('../../services/cvService');
          const langId = 1;
          const updateData = {
              language_name: 'French',
              proficiency_level: 'Native'
          };

          dbAsync.run.mockResolvedValue({ lastID: 1 });

          await updateLanguage(langId, updateData);

          expect(dbAsync.run).toHaveBeenCalledWith(
              'UPDATE Languages SET language_name = ?, proficiency_level = ? WHERE id = ?',
              ['French', 'Native', 1]
          );
      });
  });

  describe('updateCvMetadata', () => {
      it('should update CV metadata with skills flawlessly', async () => {
          const { updateCvMetadata } = require('../../services/cvService');
          const cvId = 1;
          const updateData = {
              title: 'Updated CV',
              is_primary: 1,
              skills: ['JavaScript', 'React', 'Node.js']
          };

          dbAsync.run.mockResolvedValue({ lastID: 1 });
          dbAsync.get.mockResolvedValueOnce({ user_id: 1 });

          await updateCvMetadata(cvId, updateData);

          expect(dbAsync.run).toHaveBeenCalledWith(
              expect.stringContaining('UPDATE Resumes SET title = ?, is_primary = ?, skills = ?'),
              expect.arrayContaining(['Updated CV', 1, JSON.stringify(['JavaScript', 'React', 'Node.js'])])
          );
      });

      it('should update CV metadata without skills flawlessly', async () => {
          const { updateCvMetadata } = require('../../services/cvService');
          const cvId = 1;
          const updateData = {
              title: 'Updated CV',
              is_primary: 0
          };

          dbAsync.run.mockResolvedValue({ lastID: 1 });

          await updateCvMetadata(cvId, updateData);

          expect(dbAsync.run).toHaveBeenCalledWith(
              'UPDATE Resumes SET title = ?, is_primary = ? WHERE id = ?',
              ['Updated CV', 0, 1]
          );
      });
  });
});
