const cheerio = require('cheerio');
const fs = require('fs');
const { scrapeDynamicPage } = require('./services/scraperService');

async function testCheerio() {
    const url = 'https://iaea.taleo.net/careersection/ex/jobsearch.ftl';
    const html = await scrapeDynamicPage(url);
    const $ = cheerio.load(html);

    const jobs = [];
    $('a[href*="jobdetail.ftl"]').each((i, el) => {
         const title = $(el).text().trim();
         const href = $(el).attr('href');
         if (title && href && title.length > 3) {
              jobs.push({ title, href });
         }
    });

    console.log(`[CHEERIO] Found: ${jobs.length} links`);
    console.log(JSON.stringify(jobs.slice(0, 5), null, 2));
}

testCheerio().catch(console.error);
