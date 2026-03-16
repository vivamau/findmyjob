-- Create Educations Table
CREATE TABLE IF NOT EXISTS Educations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    institution_name TEXT NOT NULL,
    degree_title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES Resumes(id) ON DELETE CASCADE
);

-- Create Languages Table
CREATE TABLE IF NOT EXISTS Languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    language_name TEXT NOT NULL,
    proficiency_level TEXT NOT NULL, -- e.g. Native, Fluent, B2, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES Resumes(id) ON DELETE CASCADE
);
