const express = require('express');
const router = express.Router();
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

module.exports = router;
