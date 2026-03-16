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
});
