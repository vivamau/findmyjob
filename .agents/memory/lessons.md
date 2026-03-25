# Lessons Learned

## Session: GlobalJobs.org Scraper Fix (2026-03-25)

1. **AI Model Context Size Limitations**: AI models can be overwhelmed by large context sizes, even if they theoretically support them. The glm-5:cloud model was returning empty responses when given 15,000+ characters, but worked correctly with 8,000 characters.

2. **Component-Level Debugging**: When debugging scraper issues, test each component independently. The scraping (fetching) was working correctly, but the parsing (AI) was failing. Isolating the issue to the AI parser saved significant debugging time.

3. **Context Size vs. Information Retention**: Reducing context size from 15,000 to 8,000 characters improved AI parsing reliability without significant loss of information. The 8,000 character limit still captured 8 jobs successfully.

4. **Test with Smaller Samples First**: Always test with smaller samples first to isolate the issue. Testing with 2,743 characters revealed that the AI could parse the content correctly, which led to identifying the context size as the problem.

5. **Documentation Importance**: Creating detailed debug scripts and session documentation helps in understanding the problem and solution, making it easier to reference in the future.

6. **Following Agent Guidelines**: Always follow the agents.md instructions for session documentation, including creating session logs and updating progress/lessons/decisions/implementation files.
