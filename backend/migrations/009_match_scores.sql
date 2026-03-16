CREATE TABLE IF NOT EXISTS MatchScores (
    resume_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    match_score INTEGER NOT NULL,
    matching_tags TEXT, -- JSON Array formatted string
    summary_analysis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (resume_id, job_id),
    FOREIGN KEY (resume_id) REFERENCES Resumes(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES JobListings(id) ON DELETE CASCADE
);
