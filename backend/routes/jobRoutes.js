const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');
const { parseJobListings, summarizeJobDescription } = require('../services/aiService');
const vectorService = require('../services/vectorService');
const { createTask, updateTask, runInBackground, isCancelled } = require('../services/taskService');
const axios = require('axios');

let scrapeStatus = 'idle';

// Extract jobs from schema.org JobPosting JSON-LD blocks embedded in page HTML
function extractJsonLdJobs(html, sourceName, sourceUrl) {
    const jobs = [];
    const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        try {
            const data = JSON.parse(match[1]);
            const items = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
            for (const item of items) {
                if (item['@type'] === 'JobPosting') {
                    const loc = item.jobLocation;
                    const address = Array.isArray(loc) ? loc[0]?.address : loc?.address;
                    jobs.push({
                        company_name: item.hiringOrganization?.name || sourceName || '',
                        role_title: item.title || 'Position',
                        location: [address?.addressLocality, address?.addressCountry].filter(Boolean).join(', '),
                        salary_range: '',
                        description: (item.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 2000),
                        apply_link: item.url || sourceUrl
                    });
                }
            }
        } catch { /* malformed JSON-LD — skip */ }
    }
    return jobs;
}

// Extract job links from rendered HTML using Cheerio — works for iCIMS, Greenhouse, Lever, etc.
// Looks for <a> tags whose href contains common ATS job-path patterns.
function extractJobsViaCheerio(html, sourceName, sourceUrl) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const baseUrl = (() => { try { const u = new URL(sourceUrl); return `${u.protocol}//${u.host}`; } catch { return ''; } })();

    const JOB_PATH_PATTERNS = [
        /\/job\//i, /\/jobs\//i, /\/career\//i, /\/careers\//i,
        /\/position\//i, /\/vacancy\//i, /\/vacancies\//i, /\/opening\//i,
        /\/requisition\//i, /\/posting\//i, /en-us\/job\//i,
    ];
    const SKIP_TITLE_WORDS = /^(home|about|contact|login|sign in|apply|search|back|next|previous|more|filter|clear|reset|all jobs|job search|\s*)$/i;

    const seen = new Set();
    const jobs = [];

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim().replace(/\s+/g, ' ');

        if (!title || title.length < 4 || title.length > 200) return;
        if (SKIP_TITLE_WORDS.test(title)) return;
        if (!JOB_PATH_PATTERNS.some(p => p.test(href))) return;

        const fullHref = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
        if (seen.has(fullHref)) return;
        seen.add(fullHref);

        // Try to find location text near the link (sibling/parent text)
        const container = $(el).closest('li, tr, div, article');
        const containerText = container.text().replace(title, '').replace(/\s+/g, ' ').trim().substring(0, 120);

        jobs.push({
            company_name: sourceName || '',
            role_title: title,
            location: containerText || '',
            salary_range: '',
            description: '',
            apply_link: fullHref,
        });
    });

    console.log(`[SCRAPE_CHEERIO] Extracted ${jobs.length} jobs via link pattern matching`);
    return jobs;
}

// Clean page HTML down to text and run through the AI job extractor
async function extractJobsViaAI(pageData, source) {
    const textLimit = source.scrape_text_limit || 8000;
    const cleanedText = pageData
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<(?!a|A|\/a|\/A)\b[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, textLimit);
    console.log(`[SCRAPE] Stripped length: ${cleanedText.length} (limit: ${textLimit})`);
    return parseJobListings(cleanedText);
}

// GET /api/jobs/scrape-status
router.get('/scrape-status', (req, res) => {
    res.json({ status: scrapeStatus });
});

// GET /api/jobs/sources
router.get('/sources', async (req, res) => {
    try {
        const rows = await dbAsync.all('SELECT * FROM JobSources');
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/jobs
router.get('/', async (req, res) => {
    try {
        const resume_id = req.query.resume_id;
        let rows;
        if (resume_id) {
            const sql = `
                SELECT JobListings.*, JobSources.url as source_url, JobSources.name as source_name,
                       MatchScores.match_score, MatchScores.matching_tags, MatchScores.summary_analysis
                FROM JobListings
                LEFT JOIN JobSources ON JobListings.source_id = JobSources.id
                LEFT JOIN MatchScores ON JobListings.id = MatchScores.job_id AND MatchScores.resume_id = ?
                ORDER BY JobListings.created_at DESC
            `;
            rows = await dbAsync.all(sql, [resume_id]);
        } else {
            rows = await dbAsync.all(`
                SELECT JobListings.*, JobSources.url as source_url, JobSources.name as source_name
                FROM JobListings
                LEFT JOIN JobSources ON JobListings.source_id = JobSources.id
                ORDER BY JobListings.created_at DESC
            `);
        }
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/jobs/sources
router.post('/sources', async (req, res) => {
    const { url, scrape_interval_days, name, description, scrape_text_limit } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        await dbAsync.run(
            'INSERT INTO JobSources (url, scrape_interval_days, name, description, scrape_text_limit) VALUES (?,?,?,?,?)',
            [url, scrape_interval_days || 1, name || '', description || '', scrape_text_limit || 8000]
        );
        res.status(201).json({ message: 'Job source added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/jobs/:id — remove a single job listing
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbAsync.run('DELETE FROM MatchScores WHERE job_id = ?', [id]);
        await dbAsync.run('DELETE FROM JobListings WHERE id = ?', [id]);
        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/jobs/sources/:id
router.delete('/sources/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Manual cascade safety flaws setup flawless
        await dbAsync.run('DELETE FROM JobListings WHERE source_id = ?', [id]);
        await dbAsync.run('DELETE FROM JobSources WHERE id = ?', [id]);
        res.status(200).json({ message: 'Job source deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/jobs/sources/:id
router.put('/sources/:id', async (req, res) => {
    const { url, scrape_interval_days, name, description, scrape_text_limit } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const result = await dbAsync.run(
             'UPDATE JobSources SET url = ?, scrape_interval_days = ?, name = ?, description = ?, scrape_text_limit = ? WHERE id = ?',
             [url, scrape_interval_days || 1, name || '', description || '', scrape_text_limit || 8000, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: 'Job source not found' });
        res.status(200).json({ message: 'Job source updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper function to scrape a single job source
async function scrapeSingleSource(source) {
    scrapeStatus = 'scraping';
    console.log(`[SCRAPE] Fetching: ${source.url}`);

    let jobs = [];
    let pageData = '';
    let usedPuppeteer = false;

    // ── Pass 0a: Workday JSON API (fast path for Workday tenants) ────────────
    if (source.url.includes('myworkdaysite.com')) {
        try {
            const urlObj = new URL(source.url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts[0] === 'recruiting') {
                const tenant = pathParts[1];
                const siteName = pathParts[2];
                const apiUrl = `https://${urlObj.hostname}/wday/cxs/${tenant}/${siteName}/jobs`;
                const workdayRes = await axios.post(apiUrl, {
                    appliedFacets: {}, limit: 20, offset: 0, searchText: ''
                }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
                pageData = JSON.stringify(workdayRes.data);
                if (workdayRes.data?.jobPostings) {
                    jobs = workdayRes.data.jobPostings.map(j => ({
                        company_name: source.name || 'Workday Tenant',
                        role_title: j.title || 'Position',
                        location: j.locationsText || '',
                        salary_range: '',
                        description: `Posted: ${j.postedOn || 'n/a'}`,
                        apply_link: `https://${urlObj.hostname}${j.externalPath}`
                    }));
                    console.log(`[SCRAPE_WORKDAY] Found ${jobs.length} jobs via Workday API`);
                }
            }
        } catch (err) {
            console.log(`[SCRAPE_WORKDAY] API failed (${err.message}), falling through to generic strategy`);
        }
    }

    // ── Fetch page HTML if not already obtained via a JSON API ───────────────
    if (jobs.length === 0) {
        let looksHeavyJS = false;
        if (!pageData) {
            try {
                const page = await axios.get(source.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    }
                });
                pageData = page.data;
                looksHeavyJS = pageData.includes("verify that you're not a robot") ||
                               pageData.includes("JavaScript is disabled") ||
                               pageData.includes("requires JavaScript") ||
                               pageData.includes("Enable JavaScript") ||
                               pageData.includes("Incapsula") ||
                               source.url.includes('.ftl') ||
                               pageData.includes('No jobs correspond to the specified criteria') ||
                               pageData.length < 1000;
            } catch (err) {
                console.log(`[SCRAPE] Static fetch failed (${err.message}). Forcing Puppeteer...`);
                looksHeavyJS = true;
            }

            if (looksHeavyJS) {
                console.log(`[SCRAPE] Heavy JS / anti-bot detected. Using Puppeteer...`);
                const { scrapeDynamicPage } = require('../services/scraperService');
                pageData = await scrapeDynamicPage(source.url);
                usedPuppeteer = true;
            }
        }

        // ── Pass 0b: Taleo (.ftl) Cheerio extractor ──────────────────────────
        if (source.url.includes('.ftl') || pageData.includes('jobdetail.ftl')) {
            console.log(`[SCRAPE] Detected Taleo (.ftl) layout. Using Cheerio extractor...`);
            const cheerio = require('cheerio');
            const $ = cheerio.load(pageData);
            const urlObj = new URL(source.url);
            $('a[href*="jobdetail.ftl"]').each((i, el) => {
                const title = $(el).text().trim();
                const href = $(el).attr('href');
                if (title && href && title.length > 3) {
                    jobs.push({
                        company_name: source.name || 'Taleo Position',
                        role_title: title,
                        location: 'As indicated',
                        salary_range: '',
                        description: 'Refer detailed page for position description',
                        apply_link: href.startsWith('http') ? href : `${urlObj.protocol}//${urlObj.hostname}${href}`
                    });
                }
            });
            console.log(`[SCRAPE_FTL] Extracted ${jobs.length} jobs via Cheerio`);
        }

        // ── Pass 1: JSON-LD (schema.org JobPosting) ───────────────────────────
        if (jobs.length === 0) {
            jobs = extractJsonLdJobs(pageData, source.name, source.url);
            if (jobs.length > 0) {
                console.log(`[SCRAPE_JSONLD] Found ${jobs.length} jobs via JSON-LD`);
            }
        }

        // ── Pass 2: Cheerio link extraction (iCIMS, Greenhouse, Lever, etc.) ──
        if (jobs.length === 0) {
            jobs = extractJobsViaCheerio(pageData, source.name, source.url);
        }

        // ── Pass 3: AI on stripped text ───────────────────────────────────────
        if (jobs.length === 0) {
            console.log(`[SCRAPE] Trying AI extraction (limit: ${source.scrape_text_limit || 8000} ch)...`);
            scrapeStatus = 'parsing';
            jobs = await extractJobsViaAI(pageData, source);
        }

        // ── Pass 4: Puppeteer retry → JSON-LD → Cheerio → AI ─────────────────
        if (jobs.length === 0 && !usedPuppeteer) {
            console.log(`[SCRAPE] 0 jobs, retrying with Puppeteer...`);
            try {
                const { scrapeDynamicPage } = require('../services/scraperService');
                pageData = await scrapeDynamicPage(source.url);
                usedPuppeteer = true;

                jobs = extractJsonLdJobs(pageData, source.name, source.url);
                if (jobs.length > 0) {
                    console.log(`[SCRAPE_JSONLD] Found ${jobs.length} jobs via JSON-LD after Puppeteer`);
                }
                if (jobs.length === 0) {
                    jobs = extractJobsViaCheerio(pageData, source.name, source.url);
                }
                if (jobs.length === 0) {
                    console.log(`[SCRAPE] Trying AI extraction on Puppeteer content (limit: ${source.scrape_text_limit || 8000} ch)...`);
                    scrapeStatus = 'parsing';
                    jobs = await extractJobsViaAI(pageData, source);
                }
            } catch (puppeteerErr) {
                console.error(`[SCRAPE] Puppeteer retry failed: ${puppeteerErr.message}`);
            }
        }

        console.log(`[SCRAPE] Final result: ${jobs.length} jobs from ${source.url}`);
    }

    // depth 1: Follow links for deeper descriptions flawlessly
    console.log(`[SCRAPE] Following links for ${jobs.length} jobs to expand context...`);
    for (const job of jobs) {
        let detailUrl = job.apply_link;
        if (detailUrl && !detailUrl.startsWith('http') && !detailUrl.startsWith('javascript:')) {
            const urlObj = new URL(source.url);
            detailUrl = `${urlObj.origin}${detailUrl.startsWith('/') ? '' : '/'}${detailUrl}`;
            job.apply_link = detailUrl;
        }

        if (detailUrl && detailUrl.startsWith('http') && detailUrl !== source.url) {
            try {
                let detailHtml = '';
                const isDynamic = detailUrl.includes('successfactors') || detailUrl.includes('workday');
                
                if (isDynamic) {
                    try {
                        const { scrapeDynamicPage } = require('../services/scraperService');
                        detailHtml = await scrapeDynamicPage(detailUrl);
                    } catch (dynErr) {
                        console.log(`[SCRAPE_DEPTH_1] Dynamic scrape failed for: ${detailUrl} (${dynErr.message})`);
                    }
                }

                if (!detailHtml) {
                    const detailPage = await axios.get(detailUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                            'Accept': 'text/html'
                        },
                        timeout: 8000 // Avert hanging flaws
                    });
                    detailHtml = detailPage.data;
                }
                
                const cleanedDetail = detailHtml
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .substring(0, 10000);

                if (cleanedDetail.length > 300) {
                    try {
                        console.log(`[AI_SUMMARY] Summarizing full text for: ${job.role_title || 'Position'}`);
                        const aiSummary = await summarizeJobDescription(cleanedDetail);
                        if (aiSummary) {
                            job.description = aiSummary;
                        } else {
                            job.description = `${job.description || ''}\n\n[FULL DETAILS]\n${cleanedDetail}`;
                        }
                    } catch (aiErr) {
                         console.error(`[AI_SUMMARY] Failed for ${job.role_title || 'Position'}:`, aiErr.message);
                         job.description = `${job.description || ''}\n\n[FULL DETAILS]\n${cleanedDetail}`;
                    }
                }
            } catch (err) {
                console.log(`[SCRAPE_DEPTH_1] Static follow failed for ${job.apply_link} (${err.message})`);
            }
        }
    }
    
    scrapeStatus = 'saving';
    for (const job of jobs) {
         const insertRes = await dbAsync.run(
             'INSERT INTO JobListings (source_id, company_name, role_title, location, salary_range, description, apply_link) VALUES (?,?,?,?,?,?,?)',
             [source.id, source.name || job.company_name || 'Unknown', job.role_title || 'Position', job.location || '', job.salary_range || '', job.description || '', job.apply_link || source.url]
         );
         // Instantly sync the scraped result into LanceDB
         if (insertRes && insertRes.lastID) {
             await vectorService.indexJob(insertRes.lastID, job.role_title || 'Position', job.description || '');
         }
    }
    await dbAsync.run('UPDATE JobSources SET last_scraped_at = CURRENT_TIMESTAMP, last_scraped_content = ? WHERE id = ?', [pageData, source.id]);
    
    return { jobs, pageData };
}

// POST /api/jobs/sources/:id/scrape — returns task_id immediately
// Always runs when called directly (user explicitly clicked Run); interval check only applies to the bulk "Run All"
router.post('/sources/:id/scrape', async (req, res) => {
    const source = await dbAsync.get('SELECT * FROM JobSources WHERE id = ?', [req.params.id]);
    if (!source) return res.status(404).json({ error: 'Job source not found' });

    const label = source.name || source.url || `Source #${source.id}`;
    const taskId = await createTask('scrape', `Scraping "${label}"`);
    res.status(202).json({ task_id: taskId });

    runInBackground(taskId, async () => {
        await updateTask(taskId, { progress: 10, detail: 'Fetching page...' });
        const { jobs } = await scrapeSingleSource(source);
        scrapeStatus = 'idle';
        await updateTask(taskId, {
            status: 'done',
            progress: 100,
            detail: `${(jobs || []).length} jobs found`
        });
    });
});

// POST /api/jobs/scrape — returns task_id immediately, tracks per-source progress
router.post('/scrape', async (req, res) => {
    const sources = await dbAsync.all('SELECT * FROM JobSources WHERE is_active = 1');

    const taskId = await createTask('scrape', `Scraping ${sources.length} source${sources.length !== 1 ? 's' : ''}`);
    res.status(202).json({ task_id: taskId });

    runInBackground(taskId, async () => {
        const total = sources.length;
        let done = 0;

        for (const source of sources) {
            if (await isCancelled(taskId)) return;
            try {
                const now = new Date();
                const lastScraped = source.last_scraped_at ? new Date(source.last_scraped_at) : null;
                const intervalDays = source.scrape_interval_days || 1;
                if (lastScraped) {
                    const diffDays = (now.getTime() - lastScraped.getTime()) / (1000 * 60 * 60 * 24);
                    if (diffDays < intervalDays) {
                        console.log(`[SCRAPE] Skipping ${source.url} - interval not reached`);
                        done++;
                        continue;
                    }
                }

                const label = source.name || source.url;
                await updateTask(taskId, {
                    progress: Math.round((done / total) * 100),
                    detail: `Scraping "${label}"...`
                });

                await scrapeSingleSource(source);
            } catch (innerErr) {
                console.error(`[SCRAPE] Failed source ${source.url}`, innerErr.message);
            }
            done++;
            await updateTask(taskId, { progress: Math.round((done / total) * 100) });
        }

        scrapeStatus = 'idle';
        await updateTask(taskId, { status: 'done', progress: 100, detail: `${total} source${total !== 1 ? 's' : ''} processed` });
    });
});

module.exports = router;
