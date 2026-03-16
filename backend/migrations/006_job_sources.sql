-- Migration: Job Sources & Scrapes layout
CREATE TABLE IF NOT EXISTS JobSources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,
    last_scraped_at DATETIME
);

CREATE TABLE IF NOT EXISTS JobListings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    company_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    location TEXT,
    salary_range TEXT,
    description TEXT,
    apply_link TEXT,
    status TEXT DEFAULT 'New', -- e.g. New, Scraped, Applied
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES JobSources(id) ON DELETE CASCADE
);
