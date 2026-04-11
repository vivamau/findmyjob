const express = require('express');
const router = express.Router();
const { getTask, getRecentTasks, cancelTask } = require('../services/taskService');

// GET /api/tasks
router.get('/', async (req, res) => {
    try {
        const tasks = await getRecentTasks(20);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
    try {
        const task = await getTask(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/tasks/:id/cancel
router.post('/:id/cancel', async (req, res) => {
    try {
        await cancelTask(req.params.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
