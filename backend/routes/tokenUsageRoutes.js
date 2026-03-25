const express = require('express');
const { dbAsync } = require('../db');

const router = express.Router();

// GET /api/tokens - Get all token usage records
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const tokenUsage = await dbAsync.all(
            'SELECT * FROM TokenUsage ORDER BY started_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        res.status(200).json(tokenUsage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tokens/summary - Get token usage summary grouped by model and operation
router.get('/summary', async (req, res) => {
    try {
        const summary = await dbAsync.all(
            `SELECT model_used, operation_type,
             SUM(tokens_in) as total_tokens_in,
             SUM(tokens_out) as total_tokens_out,
             COUNT(*) as total_operations
             FROM TokenUsage
             GROUP BY model_used, operation_type
             ORDER BY total_tokens_in DESC`
        );

        res.status(200).json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tokens/stats - Get overall statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await dbAsync.get(
            `SELECT
             COUNT(*) as total_operations,
             SUM(tokens_in) as total_tokens_in,
             SUM(tokens_out) as total_tokens_out,
             SUM(tokens_in + tokens_out) as total_tokens,
             MIN(started_at) as first_operation,
             MAX(ended_at) as last_operation
             FROM TokenUsage`
        );

        res.status(200).json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
