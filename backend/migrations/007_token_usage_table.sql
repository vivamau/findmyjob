-- Migration: Create TokenUsage table for tracking metrics
CREATE TABLE IF NOT EXISTS TokenUsage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_used TEXT,
    operation_type TEXT, -- e.g. parseJobListings, parseCv, matchCv, summarize
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
