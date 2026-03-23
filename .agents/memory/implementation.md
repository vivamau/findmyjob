# LanceDB Integration

**Date:** 2026-03-23

## Phase 1 (Completed)
- Integrated `vectordb` to connect to LanceDB embedded format logic.
- Extended `aiService.js` adding universal `.generateEmbedding(text, provider)`.
- Core Node execution wrapped in `vectorService.js` (`indexJob()`, `searchJobs()`).
- Bootstrapped Express API (`backend/routes/searchRoutes.js`).

## Phase 2 (Planning)
**Plan:** Incorporating the new vector search into the existing Job Search visual UI and managing database propagation synchronization.

**Architecture:**
- **Sync Script:** `backend/scripts/syncLanceDB.js` loops through `JobListings` and pipes them into our vector service index map.
- **Auto-Sync Hook:** `jobRoutes.js` `/api/jobs/scrape` route will instantly invoke `vectorService.indexJob` for real-time scraped jobs.
- **React Frontend (`JobSearch.tsx` & `SearchHeader.tsx`):**
    - Adding a toggle/button for identifying an "AI Semantic Match".
    - Hooking the state up to query `/api/search/semantic`.
    - Mapping LanceDB returned `job_id` distances directly onto standard hydrated jobs for seamless UI injection, preserving all local design filters.

**Verification Steps:**
1. Manually trigger `syncLanceDB.js` in terminal.
2. Validate UI Semantic queries effectively filter the list via contextual queries rather than explicit string keywords.
