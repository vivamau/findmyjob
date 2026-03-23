const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');
const { parseJobListings } = require('../services/aiService');
const vectorService = require('../services/vectorService');
const axios = require('axios');

let scrapeStatus = 'idle';

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
                SELECT JobListings.*, JobSources.url as source_url, MatchScores.match_score, MatchScores.matching_tags, MatchScores.summary_analysis 
                FROM JobListings 
                LEFT JOIN JobSources ON JobListings.source_id = JobSources.id 
                LEFT JOIN MatchScores ON JobListings.id = MatchScores.job_id AND MatchScores.resume_id = ?
                ORDER BY JobListings.created_at DESC
            `;
            rows = await dbAsync.all(sql, [resume_id]);
        } else {
            rows = await dbAsync.all('SELECT JobListings.*, JobSources.url as source_url FROM JobListings LEFT JOIN JobSources ON JobListings.source_id = JobSources.id ORDER BY JobListings.created_at DESC');
        }
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/jobs/sources
router.post('/sources', async (req, res) => {
    const { url, scrape_interval_days, name, description } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        await dbAsync.run(
            'INSERT INTO JobSources (url, scrape_interval_days, name, description) VALUES (?,?,?,?)', 
            [url, scrape_interval_days || 1, name || '', description || '']
        );
        res.status(201).json({ message: 'Job source added successfully' });
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
    const { url, scrape_interval_days, name, description } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const result = await dbAsync.run(
             'UPDATE JobSources SET url = ?, scrape_interval_days = ?, name = ?, description = ? WHERE id = ?',
             [url, scrape_interval_days || 1, name || '', description || '', req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: 'Job source not found' });
        res.status(200).json({ message: 'Job source updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/jobs/scrape
router.post('/scrape', async (req, res) => {
    try {
        const sources = await dbAsync.all('SELECT * FROM JobSources WHERE is_active = 1');
        
        for (const source of sources) {
            try {
                // Scrape interval fallback guard flawless
                const now = new Date();
                const lastScraped = source.last_scraped_at ? new Date(source.last_scraped_at) : null;
                const intervalDays = source.scrape_interval_days || 1;

                if (lastScraped) {
                    const diffDays = (now.getTime() - lastScraped.getTime()) / (1000 * 60 * 60 * 24);
                    if (diffDays < intervalDays) {
                         console.log(`[SCRAPE] Skipping ${source.url} - Interval not reached yet flaws`);
                         continue;
                    }
                }

                scrapeStatus = 'scraping';
                console.log(`[SCRAPE] Fetching: ${source.url}`);
                
                let jobs = [];
                let pageData = '';
                if (source.url.includes('myworkdaysite.com')) {
                    // Workday Client-Side JSON API Adapter
                    const urlObj = new URL(source.url);
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);
                    if (pathParts[0] === 'recruiting') {
                         const tenant = pathParts[1];
                         const siteName = pathParts[2];
                         const apiUrl = `https://${urlObj.hostname}/wday/cxs/${tenant}/${siteName}/jobs`;
                         
                         const workdayRes = await axios.post(apiUrl, {
                             appliedFacets: {}, limit: 20, offset: 0, searchText: ""
                         }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
                         
                         pageData = JSON.stringify(workdayRes.data);

                         if (workdayRes.data && workdayRes.data.jobPostings) {
                                 jobs = workdayRes.data.jobPostings.map(j => ({
                                     company_name: source.name || 'Workday Tenant',
                                     role_title: j.title || 'Position',
                                     location: j.locationsText || '',
                                     salary_range: '',
                                     description: `Posted: ${j.postedOn || 'n/a'}`,
                                     apply_link: `https://${urlObj.hostname}${j.externalPath}`
                                 }));
                         }
                    }
                } else {
                    // Standard Static Scraper via AI list extractor
                    let looksHeavyJS = false;
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
                                       pageData.includes("Incapsula") || 
                                       source.url.includes('.ftl') || 
                                       pageData.includes('No jobs correspond to the specified criteria') ||
                                       pageData.length < 1000;
                    } catch (err) {
                        console.log(`[SCRAPE] Static fetch failed for ${source.url} (${err.message}). Forcing Puppeteer fallback...`);
                        looksHeavyJS = true; // Force fallback node flawless
                    }

                    if (looksHeavyJS) {
                         console.log(`[SCRAPE] Anti-bot or heavy JS detected on ${source.url}. Falling back to Puppeteer...`);
                         const { scrapeDynamicPage } = require('../services/scraperService');
                         pageData = await scrapeDynamicPage(source.url);
                    }

                    if (source.url.includes('.ftl') || pageData.includes('jobdetail.ftl')) {
                         console.log(`[SCRAPE] Detected Taleo (.ftl) layout. Using Cheerio absolute Speed extractor...`);
                         const cheerio = require('cheerio');
                         const $ = cheerio.load(pageData);
                         const urlObj = new URL(source.url);
                         jobs = [];

                         $('a[href*="jobdetail.ftl"]').each((i, el) => {
                              const title = $(el).text().trim();
                              const href = $(el).attr('href');
                              if (title && href && title.length > 3) {
                                   jobs.push({
                                        company_name: source.name || 'Taleo Position',
                                        role_title: title,
                                        location: 'As indicated',
                                        salary_range: '',
                                        description: 'Refer detailed page for position description node flawlessly',
                                        apply_link: href.startsWith('http') ? href : `${urlObj.protocol}//${urlObj.hostname}${href}`
                                   });
                              }
                         });
                         console.log(`[SCRAPE_FTL] Extracted ${jobs.length} jobs via Cheerio node flawlessly`);
                    } else {
                        // Strip scripts, styles, and heavy HTML markup to fit context window budget node flawless
                        const cleanedText = pageData
                            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 15000); // 15,000 chars is fully safe with expanded num_ctx flawlessly

                        console.log(`[SCRAPE] Stripped length: ${cleanedText.length} from original flaws`);
                        scrapeStatus = 'parsing';
                        jobs = await parseJobListings(cleanedText); 
                    }
                }

                // depth 1: Follow links for deeper descriptions flawlessly
                console.log(`[SCRAPE] Following links for ${jobs.length} jobs to expand context...`);
                for (const job of jobs) {
                    if (job.apply_link && job.apply_link.startsWith('http') && job.apply_link !== source.url) {
                        try {
                            const detailPage = await axios.get(job.apply_link, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                                    'Accept': 'text/html'
                                },
                                timeout: 8000 // Avert hanging flaws
                            });
                            
                            const cleanedDetail = detailPage.data
                                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .substring(0, 10000);

                            if (cleanedDetail.length > 300) {
                                job.description = `${job.description || ''}\n\n[FULL DETAILS]\n${cleanedDetail}`;
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
            } catch (innerErr) {
                console.error(`[SCRAPE] Failed source ${source.url}`, innerErr.message);
                await dbAsync.run('UPDATE JobSources SET last_scraped_at = CURRENT_TIMESTAMP, last_scraped_content = ? WHERE id = ?', [pageData || '', source.id]);
            }
        }
        scrapeStatus = 'idle';
        res.status(200).json({ message: 'Scraping job triggers complete flawlessly' });
    } catch (err) {
        scrapeStatus = 'idle';
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
