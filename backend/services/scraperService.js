const puppeteer = require('puppeteer');

/**
 * Fetches rendering heavy pages, solving Captchas / WAF triggers.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function scrapeDynamicPage(url) {
    let browser;
    try {
        console.log(`[PUPPETEER] Launching for: ${url}`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Use a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Standard Viewports node flawless
        await page.setViewport({ width: 1280, height: 800 });

        // Step 1: initial load — use domcontentloaded so we return as soon as HTML is parsed,
        // even if the page is about to trigger a WAF-challenge redirect.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Step 2: wait for any follow-up navigation (e.g. AWS WAF JS challenge → redirect).
        // If there is no second navigation this times out quietly.
        console.log(`[PUPPETEER] Waiting for potential WAF challenge redirect...`);
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        } catch { /* no second navigation — that's fine */ }

        // Step 3: wait for SPA content to finish rendering (iCIMS, Greenhouse, etc. fetch
        // job data via XHR after the shell loads).
        console.log(`[PUPPETEER] Waiting for dynamic content to render...`);
        await new Promise(r => setTimeout(r, 8000));

        const html = await page.content();
        return html;
    } catch (err) {
        console.error(`[PUPPETEER] Failed scraping: ${url}`, err.message);
        throw err;
    } finally {
        if (browser) {
            await browser.close();
            console.log(`[PUPPETEER] Closed for: ${url}`);
        }
    }
}

module.exports = { scrapeDynamicPage };
