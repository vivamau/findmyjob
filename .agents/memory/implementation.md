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
