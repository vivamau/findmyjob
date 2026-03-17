UPDATE Prompts SET prompt_text = 'Below is the text of a CV document.
         
        --- CV TEXT ---
        ${cvText}
        --- END OF CV ---

        You are an expert resume parsing system. Extract ALL listed records for Work Experience, Education, Languages, and a list of extracted Skills (as tags/keywords list of strings). 
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
            }
          ],
          "skills": ["React", "TypeScript", "NodeJS", "TDD", "REST API", "Git"]
        }

        Return empty lists if no items found.'
WHERE key = 'cv_parser_model';
