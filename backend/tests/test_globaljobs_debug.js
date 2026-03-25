/**
 * Debug script for globaljobs.org scraping issue
 * Tests both axios and Puppeteer scraping methods
 */

const axios = require('axios');
const { scrapeDynamicPage } = require('../services/scraperService');
const { parseJobListings } = require('../services/aiService');

const GLOBALJOBS_URL = 'https://globaljobs.org/';

async function debugGlobaljobs() {
    console.log('=== DEBUGGING GLOBALJOBS.ORG SCRAPER ===\n');

    // Test 1: Try static fetch with axios
    console.log('Test 1: Static fetch with axios');
    console.log('-----------------------------------');
    try {
        const response = await axios.get(GLOBALJOBS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 30000
        });

        console.log(`Status: ${response.status}`);
        console.log(`Content-Length: ${response.data.length}`);
        console.log(`Content-Type: ${response.headers['content-type']}`);

        // Check for anti-bot indicators
        const hasAntiBot = response.data.includes("verify that you're not a robot") ||
                          response.data.includes("JavaScript is disabled") ||
                          response.data.includes("Incapsula") ||
                          response.data.includes('Access Denied');

        console.log(`Anti-bot detected: ${hasAntiBot}`);
        console.log(`Has job-related keywords: ${response.data.toLowerCase().includes('job')}`);

        // Show first 500 chars of content
        console.log('\nFirst 500 chars of response:');
        console.log(response.data.substring(0, 500));
        console.log('\n');

        // Clean the text for AI parsing
        const cleanedText = response.data
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 15000);

        console.log(`Cleaned text length: ${cleanedText.length}`);
        console.log('First 500 chars of cleaned text:');
        console.log(cleanedText.substring(0, 500));
        console.log('\n');

    } catch (err) {
        console.error(`Axios fetch failed: ${err.message}`);
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error(`Headers:`, err.response.headers);
        }
    }

    // Test 2: Try dynamic fetch with Puppeteer
    console.log('\nTest 2: Dynamic fetch with Puppeteer');
    console.log('-------------------------------------');
    try {
        const html = await scrapeDynamicPage(GLOBALJOBS_URL);
        console.log(`Puppeteer HTML length: ${html.length}`);

        // Check for anti-bot indicators
        const hasAntiBot = html.includes("verify that you're not a robot") ||
                          html.includes("JavaScript is disabled") ||
                          html.includes("Incapsula") ||
                          html.includes('Access Denied');

        console.log(`Anti-bot detected: ${hasAntiBot}`);
        console.log(`Has job-related keywords: ${html.toLowerCase().includes('job')}`);

        // Show first 500 chars of content
        console.log('\nFirst 500 chars of Puppeteer response:');
        console.log(html.substring(0, 500));
        console.log('\n');

        // Clean the text for AI parsing
        const cleanedText = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 15000);

        console.log(`Cleaned text length: ${cleanedText.length}`);
        console.log('First 500 chars of cleaned text:');
        console.log(cleanedText.substring(0, 500));
        console.log('\n');

        // Test 3: Try AI parsing
        console.log('\nTest 3: AI Parsing with cleaned text');
        console.log('--------------------------------------');
        try {
            const jobs = await parseJobListings(cleanedText);
            console.log(`Jobs found: ${jobs.length}`);
            if (jobs.length > 0) {
                console.log('First job:');
                console.log(JSON.stringify(jobs[0], null, 2));
            }
        } catch (aiErr) {
            console.error(`AI parsing failed: ${aiErr.message}`);
        }

    } catch (err) {
        console.error(`Puppeteer fetch failed: ${err.message}`);
    }

    console.log('\n=== DEBUG COMPLETE ===');
}

debugGlobaljobs().catch(console.error);
