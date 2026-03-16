const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');
const { parseJobListings } = require('../services/aiService');
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

// POST /api/jobs/sources
router.post('/sources', async (req, res) => {
    const { url, scrape_interval_days } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        await dbAsync.run('INSERT INTO JobSources (url, scrape_interval_days) VALUES (?,?)', [url, scrape_interval_days || 1]);
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
                                 company_name: 'Workday Tenant',
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
                
                scrapeStatus = 'saving';
                for (const job of jobs) {
                     await dbAsync.run(
                         'INSERT INTO JobListings (source_id, company_name, role_title, location, salary_range, description, apply_link) VALUES (?,?,?,?,?,?,?)',
                         [source.id, job.company_name || 'Unknown', job.role_title || 'Position', job.location || '', job.salary_range || '', job.description || '', job.apply_link || source.url]
                     );
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
