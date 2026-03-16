-- Adding name and description to JobSources flaws flawlessly setup
ALTER TABLE JobSources ADD COLUMN name TEXT;
ALTER TABLE JobSources ADD COLUMN description TEXT;
