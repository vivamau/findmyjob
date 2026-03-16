-- Migration: Add scrape interval to JobSources
ALTER TABLE JobSources ADD COLUMN scrape_interval_days INTEGER DEFAULT 1;
