# Architectural Decisions

## Vector Database Selection
- Selected LanceDB for lightweight storage.

## Gemini Provider Integration Strategy
- Use direct REST API.

## Gemini Model Adjustment
- Set default model to `gemini-3-flash-preview` based on API listing verification.

## Smart Rate Limit Exponential Backoff
**Date:** 2026-03-24
**Context/Problem:** Gemini free tier returned dense `429` blockings with explicit `"retryDelay"` instructions in body, bypassing default step timers.
**Decision:** Configured `axiosWithRetry` inside `aiService.js` at line 20 to read `error.details -> retryInfo.retryDelay` directly and sleep for the exact duration requested by Google.
**Status:** Applied to backend code.

## AI Context Size Reduction for Scraper
**Date:** 2026-03-25
**Context/Problem:** The globaljobs.org scraper was returning empty content. Investigation revealed that the AI model (glm-5:cloud) was returning empty responses when processing 15,000+ characters of cleaned text.
**Decision:** Reduced the cleaned text limit from 15,000 to 8,000 characters in [`backend/routes/jobRoutes.js:186`](backend/routes/jobRoutes.js:186). This prevents the AI model from being overwhelmed while still capturing enough job listings.
**Status:** Applied to backend code. Verified with test scripts showing 8 jobs successfully parsed.
