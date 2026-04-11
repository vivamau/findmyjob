const express = require('express');
const { listModels, getProviderConfigs, updateProviderConfig } = require('../services/aiService');
const { createTask, updateTask, runInBackground, isCancelled } = require('../services/taskService');

const router = express.Router();

router.get('/models', async (req, res) => {
    try {
        const models = await listModels();
        res.status(200).json(models);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/providers', async (req, res) => {
    try {
        const configs = await getProviderConfigs();
        res.status(200).json(configs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/providers/:id', async (req, res) => {
    try {
        await updateProviderConfig(req.params.id, req.body);
        res.status(200).json({ message: 'Provider updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ai/match
router.post('/match', async (req, res) => {
    const { resume_id, job_id, force } = req.body;
    if (!resume_id || !job_id) return res.status(400).json({ error: 'resume_id and job_id are required' });

    try {
        const { matchCvWithJob } = require('../services/aiService');
        const { dbAsync } = require('../db');

        const cached = await dbAsync.get('SELECT * FROM MatchScores WHERE resume_id = ? AND job_id = ?', [resume_id, job_id]);
        if (cached && !force) {
            return res.status(200).json({
                match_score: cached.match_score,
                matching_tags: JSON.parse(cached.matching_tags || '[]'),
                summary_analysis: cached.summary_analysis
            });
        }

        const cv = await dbAsync.get('SELECT id, title FROM Resumes WHERE id = ?', [resume_id]);
        const exps = await dbAsync.all('SELECT * FROM Experiences WHERE resume_id = ?', [resume_id]);
        const edus = await dbAsync.all('SELECT * FROM Educations WHERE resume_id = ?', [resume_id]);
        const langs = await dbAsync.all('SELECT * FROM Languages WHERE resume_id = ?', [resume_id]);

        const job = await dbAsync.get('SELECT * FROM JobListings WHERE id = ?', [job_id]);

        if (!cv || !job) return res.status(404).json({ error: 'CV or Job not found' });

        const result = await matchCvWithJob({ ...cv, experiences: exps, educations: edus, languages: langs }, job);

        await dbAsync.run(
             'INSERT OR REPLACE INTO MatchScores (resume_id, job_id, match_score, matching_tags, summary_analysis) VALUES (?, ?, ?, ?, ?)',
             [resume_id, job_id, result.match_score, JSON.stringify(result.matching_tags), result.summary_analysis]
        );

        res.status(200).json({ ...result, resume_id, job_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ai/match-batch  — returns task_id immediately, runs in background
router.post('/match-batch', async (req, res) => {
    const { resume_id, job_ids, force } = req.body;
    if (!resume_id || !job_ids || !Array.isArray(job_ids)) {
        return res.status(400).json({ error: 'resume_id and job_ids array are required' });
    }

    const { matchCvWithJob } = require('../services/aiService');
    const { dbAsync } = require('../db');

    const cv = await dbAsync.get('SELECT id, title FROM Resumes WHERE id = ?', [resume_id]);
    if (!cv) return res.status(404).json({ error: 'CV not found' });

    const activeProvider = await dbAsync.get('SELECT default_model FROM ProviderConfigs WHERE is_active = 1');
    const taskId = await createTask('batch-match', `Analyzing ${job_ids.length} jobs vs "${cv.title || 'CV'}"`, activeProvider?.default_model || null);
    res.status(202).json({ task_id: taskId });

    runInBackground(taskId, async () => {
        const exps  = await dbAsync.all('SELECT * FROM Experiences WHERE resume_id = ?', [resume_id]);
        const edus  = await dbAsync.all('SELECT * FROM Educations  WHERE resume_id = ?', [resume_id]);
        const langs = await dbAsync.all('SELECT * FROM Languages   WHERE resume_id = ?', [resume_id]);
        const cvData = { ...cv, experiences: exps, educations: edus, languages: langs };

        const total = job_ids.length;
        const results = {};

        for (let i = 0; i < total; i++) {
            if (await isCancelled(taskId)) return;
            const id = job_ids[i];
            try {
                const cached = await dbAsync.get(
                    'SELECT * FROM MatchScores WHERE resume_id = ? AND job_id = ?',
                    [resume_id, id]
                );
                if (cached && !force) {
                    results[id] = {
                        match_score: cached.match_score,
                        matching_tags: JSON.parse(cached.matching_tags || '[]'),
                        summary_analysis: cached.summary_analysis
                    };
                } else {
                    const job = await dbAsync.get('SELECT * FROM JobListings WHERE id = ?', [id]);
                    if (job) {
                        const result = await matchCvWithJob(cvData, job);
                        await dbAsync.run(
                            'INSERT OR REPLACE INTO MatchScores (resume_id, job_id, match_score, matching_tags, summary_analysis) VALUES (?, ?, ?, ?, ?)',
                            [resume_id, id, result.match_score, JSON.stringify(result.matching_tags), result.summary_analysis]
                        );
                        results[id] = result;
                    }
                }
            } catch (err) {
                console.error(`Batch match failed for job ${id}`, err);
            }

            const progress = Math.round(((i + 1) / total) * 100);
            await updateTask(taskId, { progress, result: results });
        }

        await updateTask(taskId, {
            status: 'done',
            progress: 100,
            detail: `${total} jobs analyzed`,
            result: results
        });
    });
});

router.get('/prompts', async (req, res) => {
    try {
        const { getPrompts } = require('../services/aiService');
        const prompts = await getPrompts();
        res.status(200).json(prompts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/prompts/:key', async (req, res) => {
    try {
        const { updatePrompt } = require('../services/aiService');
        await updatePrompt(req.params.key, req.body.prompt_text);
        res.status(200).json({ message: 'Prompt updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
