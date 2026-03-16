-- Migration: Add last_scraped_content to JobSources
ALTER TABLE JobSources ADD COLUMN last_scraped_content TEXT;
