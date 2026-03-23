const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');
const vectorService = require('../services/vectorService');

/**
 * Perform a semantic search query against the jobs vector DB.
 */
router.post('/semantic', async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) return res.status(400).json({ error: 'Missing query argument' });

        const results = await vectorService.searchJobs(query, limit || 5);
        res.status(200).json({ results });
    } catch (err) {
        console.error('Semantic search error:', err);
        res.status(500).json({ error: 'Failed to execute semantic search.' });
    }
});

/**
 * Manually index or re-index a job.
 */
router.post('/index-job', async (req, res) => {
    try {
        const { id, title, description } = req.body;
        if (!id || !title) return res.status(400).json({ error: 'Missing id or title' });

        const success = await vectorService.indexJob(id, title, description);
        if (success) {
            res.status(200).json({ message: 'Job indexed successfully' });
        } else {
            res.status(500).json({ error: 'Failed to index job' });
        }
    } catch (err) {
        console.error('Indexing error:', err);
        res.status(500).json({ error: 'Failed to index job.' });
    }
});

/**
 * Bulk sync all jobs into LanceDB.
 */
router.post('/sync-lancedb', async (req, res) => {
    try {
        console.log("[Sync] Fetching jobs from SQLite...");
        const jobs = await dbAsync.all('SELECT id, role_title, description FROM JobListings');
        
        console.log(`[Sync] Found ${jobs.length} jobs. Beginning sequential vector indexing...`);
        let successCount = 0;
        let failCount = 0;

        for (const job of jobs) {
            const success = await vectorService.indexJob(job.id, job.role_title || '', job.description || '');
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        res.status(200).json({ 
            message: 'Sync complete', 
            successCount, 
            failCount 
        });
    } catch (err) {
        console.error('Bulk sync error:', err);
        res.status(500).json({ error: 'Failed to execute bulk sync.' });
    }
});

module.exports = router;
