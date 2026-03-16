CREATE TABLE IF NOT EXISTS Experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES Resumes(id) ON DELETE CASCADE
);
