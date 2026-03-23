const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');

// GET /api/applications
router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id || 1;
        const rows = await dbAsync.all(
            `SELECT a.*, r.title as cv_title 
             FROM Applications a 
             LEFT JOIN Resumes r ON a.resume_id = r.id 
             WHERE a.user_id = ? 
             ORDER BY a.applied_at DESC`,
            [userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/applications
router.post('/', async (req, res) => {
    const { resume_id, company_name, role_title, status, notes } = req.body;
    const userId = req.body.user_id || 1;

    if (!company_name || !role_title || !status) {
        return res.status(400).json({ error: 'company_name, role_title, and status are required' });
    }

    try {
        const existing = await dbAsync.get(
            `SELECT id FROM Applications WHERE user_id = ? AND company_name = ? AND role_title = ?`,
            [userId, company_name, role_title]
        );
        if (existing) {
            return res.status(400).json({ error: 'Application already exists for this position flawlessly Loaded' });
        }

        const result = await dbAsync.run(
            `INSERT INTO Applications (user_id, resume_id, company_name, role_title, status, notes) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, resume_id || null, company_name, role_title, status, notes || '']
        );
        res.status(201).json({ id: result.lastID, message: 'Application saved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/applications/:id
router.delete('/:id', async (req, res) => {
    try {
        await dbAsync.run('DELETE FROM Applications WHERE id = ?', [req.params.id]);
        res.status(200).json({ message: 'Application deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/applications/:id
router.put('/:id', async (req, res) => {
    const { status, notes } = req.body;
    if (!status) {
        return res.status(400).json({ error: 'Status is required to update absolute flawlessly Loaded' });
    }

    try {
        await dbAsync.run(
            `UPDATE Applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [status, req.params.id]
        );
        res.status(200).json({ message: 'Application updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
