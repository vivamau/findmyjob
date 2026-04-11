const express = require('express');
const multer = require('multer');
const { parseCvFile, saveCvToDb, getCvsByUserId, getExperiencesByResumeId, addExperiences, addEducations, addLanguages, getEducationsByResumeId, getLanguagesByResumeId } = require('../services/cvService');
const { parseCvWithModel } = require('../services/aiService');
const { dbAsync } = require('../db');
const { createTask, updateTask, runInBackground, isCancelled } = require('../services/taskService');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id || 1; // fallback mockup
        const resumes = await getCvsByUserId(userId);
        res.status(200).json(resumes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await dbAsync.get('SELECT * FROM Resumes WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Resume not found' });
        res.status(200).json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/experiences', async (req, res) => {
    try {
        const resumeId = req.params.id;
        const experiences = await getExperiencesByResumeId(resumeId);
        res.status(200).json(experiences);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/educations', async (req, res) => {
    try {
        const resumeId = req.params.id;
        const items = await getEducationsByResumeId(resumeId);
        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/languages', async (req, res) => {
    try {
        const resumeId = req.params.id;
        const items = await getLanguagesByResumeId(resumeId);
        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Setup temporary folder for multer uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, user_id } = req.body;
        if (!title || !user_id) {
            // cleanup if missing fields
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Missing title or user_id' });
        }

        // Parse file
        const parsedData = await parseCvFile(req.file.path);
        
        if (!parsedData.text || parsedData.text.trim().length < 10) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Could not extract text from PDF. Ensure it is not an image or scanned document.' });
        }

        // Save to DB
        const resumeId = await saveCvToDb(parseInt(user_id), title, parsedData.text);

        // Cleanup temporary disk memory
        fs.unlinkSync(req.file.path);

        return res.status(201).json({
            id: resumeId,
            message: 'CV uploaded and saved successfully'
        });

    } catch (err) {
        // cleanup uploaded file on failure
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ error: err.message });
    }
});

router.post('/:id/parse', async (req, res) => {
    const resumeId = req.params.id;
    const { model, provider_id } = req.body;

    if (!model) return res.status(400).json({ error: 'Model name is required' });

    const resume = await dbAsync.get('SELECT id, title, content FROM Resumes WHERE id = ?', [resumeId]);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const taskId = await createTask('cv-parse', `Parsing "${resume.title || `CV #${resumeId}`}"`, model);
    res.status(202).json({ task_id: taskId });

    runInBackground(taskId, async () => {
        console.log(`[AI PARSE] Resume ${resumeId} using model: ${model}`);
        await updateTask(taskId, { progress: 10, detail: 'Calling AI model...' });

        const parsed = await parseCvWithModel(resume.content, model, provider_id);
        if (await isCancelled(taskId)) return;
        await updateTask(taskId, { progress: 70, detail: 'Saving results...' });

        await dbAsync.run('DELETE FROM Experiences WHERE resume_id = ?', [resumeId]);
        await dbAsync.run('DELETE FROM Educations  WHERE resume_id = ?', [resumeId]);
        await dbAsync.run('DELETE FROM Languages   WHERE resume_id = ?', [resumeId]);

        if (parsed.experiences) await addExperiences(resumeId, parsed.experiences);
        if (parsed.educations)  await addEducations(resumeId, parsed.educations);
        if (parsed.languages)   await addLanguages(resumeId, parsed.languages);

        await dbAsync.run(
            'UPDATE Resumes SET last_parse_at = CURRENT_TIMESTAMP, parse_model = ?, skills = ? WHERE id = ?',
            [model, JSON.stringify(parsed.skills || []), resumeId]
        );

        const expCount = (parsed.experiences || []).length;
        const eduCount = (parsed.educations  || []).length;
        await updateTask(taskId, {
            status: 'done',
            progress: 100,
            detail: `${expCount} exp · ${eduCount} edu`
        });
    });
});

router.delete('/:id', async (req, res) => {
    try {
        const { deleteCv } = require('../services/cvService');
        const resumeId = req.params.id;
        
        await deleteCv(resumeId);
        
        res.status(200).json({ message: 'CV and all related nodes deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/experiences/:id', async (req, res) => {
    try {
        const { updateExperience } = require('../services/cvService');
        await updateExperience(req.params.id, req.body);
        res.status(200).json({ message: 'Experience updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/educations/:id', async (req, res) => {
    try {
        const { updateEducation } = require('../services/cvService');
        await updateEducation(req.params.id, req.body);
        res.status(200).json({ message: 'Education updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/languages/:id', async (req, res) => {
    try {
        const { updateLanguage } = require('../services/cvService');
        await updateLanguage(req.params.id, req.body);
        res.status(200).json({ message: 'Language updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { updateCvMetadata } = require('../services/cvService');
        await updateCvMetadata(req.params.id, req.body);
        res.status(200).json({ message: 'CV metadata updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
