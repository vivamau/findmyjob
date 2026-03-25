/**
 * Test script to verify the globaljobs.org scraper fix
 * Tests with the reduced context size (8000 chars)
 */

const axios = require('axios');
const { scrapeDynamicPage } = require('../services/scraperService');
const { parseJobListings } = require('../services/aiService');

const GLOBALJOBS_URL = 'https://globaljobs.org/';

async function testFix() {
    console.log('=== TESTING GLOBALJOBS.ORG SCRAPER FIX ===\n');

    // Fetch the page content
    console.log('Fetching page content with Puppeteer...');
    const html = await scrapeDynamicPage(GLOBALJOBS_URL);
    console.log(`HTML length: ${html.length}\n`);

    // Clean the text with the NEW reduced limit (8000 chars)
    const cleanedText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<(?!a|A|\/a|\/A)\b[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 8000); // NEW: Reduced from 15000 to 8000

    console.log(`Cleaned text length: ${cleanedText.length}`);
    console.log('First 500 chars of cleaned text:');
    console.log(cleanedText.substring(0, 500));
    console.log('\n');

    // Parse job listings
    console.log('Parsing job listings with AI...');
    try {
        const jobs = await parseJobListings(cleanedText);
        console.log(`Jobs found: ${jobs.length}\n`);

        if (jobs.length > 0) {
            console.log('SUCCESS! The scraper is now working correctly.');
            console.log('\nFirst few jobs:');
            jobs.slice(0, 5).forEach((job, i) => {
                console.log(`\nJob ${i + 1}:`);
                console.log(`  Title: ${job.role_title}`);
                console.log(`  Company: ${job.company_name}`);
                console.log(`  Location: ${job.location}`);
            });
        } else {
            console.log('FAILED: No jobs found. The AI returned an empty response.');
        }
    } catch (err) {
        console.error('Parsing failed:', err.message);
    }

    console.log('\n=== TEST COMPLETE ===');
}

testFix().catch(console.error);
