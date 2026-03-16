const express = require('express');
const { listModels, getProviderConfigs, updateProviderConfig } = require('../services/aiService');

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

module.exports = router;
