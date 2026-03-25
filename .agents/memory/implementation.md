# LanceDB Integration

**Date:** 2026-03-23

## Phase 1 (Completed)
- Integrated `vectordb` to connect to LanceDB embedded format logic.
- Extended `aiService.js` adding universal `.generateEmbedding(text, provider)`.
- Core Node execution wrapped in `vectorService.js` (`indexJob()`, `searchJobs()`).
- Bootstrapped Express API (`backend/routes/searchRoutes.js`).

## Phase 2 (Planning)
**Plan:** Incorporating the new vector search into the existing Job Search visual UI and managing database propagation synchronization.

## Gemini Pro Integration

**Date:** 2026-03-24

**Completed:**
- Created migration `006_add_gemini_provider.sql` to seed `gemini` in `ProviderConfigs`.
- Updated `aiService.js` adding `provider === 'gemini'` branches for:
    - `parseJobListings` (JSON response)
    - `parseCvWithModel` (JSON response)
    - `matchCvWithJob` (JSON response)
    - `summarizeJobDescription` (Text response)
- Verified with unit tests using mock candidates response format for Gemini REST API.

## Token Usage Tracking

**Date:** 2026-03-24

**Completed:**
- Created migration `007_token_usage_table.sql` with `started_at` & `ended_at` for operation time analytics.
- Added `logTokenUsage` helper inside `aiService.js`.
- Configured providers branches in `parseCvWithModel`, `parseJobListings`, `matchCvWithJob`, `summarizeJobDescription` to extract:
  - **Ollama**: `prompt_eval_count`, `eval_count`
  - **OpenAI / OpenRouter / Perplexity**: `usage.prompt_tokens` / `usage.completion_tokens`
  - **Claude**: `usage.input_tokens` / `usage.output_tokens`
  - **Gemini**: `usageMetadata.promptTokenCount` / `usageMetadata.candidatesTokenCount`

## GlobalJobs.org Scraper Fix

**Date:** 2026-03-25

**Completed:**
- Created debug test scripts:
  - [`backend/tests/test_globaljobs_debug.js`](backend/tests/test_globaljobs_debug.js) - Tests both axios and Puppeteer scraping
  - [`backend/tests/test_globaljobs_simple.js`](backend/tests/test_globaljobs_simple.js) - Simple test with smaller sample
  - [`backend/tests/test_globaljobs_fix.js`](backend/tests/test_globaljobs_fix.js) - Final verification test
- Modified [`backend/routes/jobRoutes.js:186`](backend/routes/jobRoutes.js:186) to reduce cleaned text limit from 15,000 to 8,000 characters
- Verified fix with test scripts showing 8 jobs successfully parsed from globaljobs.org
- Created detailed analysis document [`plans/globaljobs-scraper-fix.md`](plans/globaljobs-scraper-fix.md)
- Updated session log [`.agents/memory/sessions/2026-03-25_15-11-07.md`](.agents/memory/sessions/2026-03-25_15-11-07.md)

**Technical Details:**
- Root cause: AI model (glm-5:cloud) was returning empty responses when processing 15,000+ characters
- Solution: Reduced context size to 8,000 characters to prevent model from being overwhelmed
- Impact: Scraper now successfully extracts job listings from globaljobs.org
