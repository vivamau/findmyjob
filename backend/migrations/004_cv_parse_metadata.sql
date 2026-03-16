-- Alter Resumes Table to add parse metadata
ALTER TABLE Resumes ADD COLUMN last_parse_at DATETIME;
ALTER TABLE Resumes ADD COLUMN parse_model TEXT;
