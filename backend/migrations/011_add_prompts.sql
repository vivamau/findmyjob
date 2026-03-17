-- Migration: 011_add_prompts.sql
CREATE TABLE IF NOT EXISTS Prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    prompt_text TEXT NOT NULL,
    description TEXT
);

INSERT OR IGNORE INTO Prompts (key, prompt_text, description) VALUES
('job_listing_parser', 'Below is the text/HTML layout of a job board or search page.
        
        --- PAGE CONTENT ---
        ${htmlText}
        --- END OF PAGE ---

        Identify and extract ALL listed Job positions present on the page layout.
        For each job, extract: company_name, role_title, location, salary_range, description, apply_link.
        
        You MUST provide response strictly as a Single JSON Object with structure shown below:
        {
          "jobs": [
            {
              "company_name": "Google",
              "role_title": "Software Engineer",
              "location": "Remote",
              "salary_range": "$120k",
              "description": "Short summary",
              "apply_link": "https://apply.com"
            }
          ]
        }', 'Extracts job listed positions from an HTML/text layout'),

('cv_parser_model', 'Below is the text of a CV document.
         
        --- CV TEXT ---
        ${cvText}
        --- END OF CV ---

        You are an expert resume parsing system. Extract ALL listed records for Work Experience, Education, and Languages. 
        You MUST format response STRICLY as a Single JSON Object with keys shown below.
        
        Example Output Format:
        {
          "experiences": [
            {
              "company_name": "Google",
              "role_title": "Software Engineer",
              "start_date": "Jan 2020",
              "end_date": "Dec 2022",
              "description": "Built core service pipelines"
            }
          ],
          "educations": [
            {
              "institution_name": "University",
              "degree_title": "BSc Computer Science",
              "start_date": "2016",
              "end_date": "2020",
              "description": "Graduated with Honors"
            }
          ],
          "languages": [
            {
              "language_name": "English",
              "proficiency_level": "Native"
            },
            {
              "language_name": "Spanish",
              "proficiency_level": "B2"
            }
          ]
        }

        Return empty lists if no items found.', 'Extracts work experience, education, and languages from a CV'),

('match_cv_with_job', 'You are an expert HR recruiter assistant. Match the Candidate CV details against the Job Description below.
        
        --- CANDIDATE CV ---
        ${JSON.stringify(cv, null, 2)}
        --- END OF CV ---

        --- JOB DESCRIPTION ---
        ${JSON.stringify(job, null, 2)}
        --- END OF JOB ---

        Calculate a compatibility fit Score (0 to 100).
        Identify the skills or keywords present in the CV that match the Job requirements for tags.
        Provide a concise 1-2 sentence analysis highlighting matches or missing gaps.

        You MUST respond strictly as a Single JSON Object with keys:
        {
          "match_score": 85,
          "matching_tags": ["React", "TypeScript"],
          "summary_analysis": "Candidate is highly compatible with the tech stack but lacks explicit management experience."
        }', 'Compares candidate CV with Job Description to generate fit Score and analysis');
