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
