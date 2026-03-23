const { dbAsync } = require('../db');
const vectorService = require('../services/vectorService');

/**
 * Iterates over all jobs existing in SQLite and forcefully integrates them into LanceDB.
 * Used for migration or manual sync execution.
 */
async function syncJobs() {
    try {
        console.log("Fetching migrating jobs from SQLite...");
        const jobs = await dbAsync.all('SELECT id, role_title, description FROM JobListings');
        
        console.log(`Found ${jobs.length} jobs. Beginning sequential vector indexing...`);
        let successCount = 0;
        let failCount = 0;

        for (const job of jobs) {
            console.log(`Indexing [${job.id}]: ${job.role_title}`);
            const success = await vectorService.indexJob(job.id, job.role_title || '', job.description || '');
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        console.log(`\n========= SYNC COMPLETE =========`);
        console.log(`Successfully Indexed: ${successCount}`);
        console.log(`Failed Vectors: ${failCount}`);
        process.exit(0);
    } catch (err) {
        console.error("Fatal error during sync:", err);
        process.exit(1);
    }
}

// Start
syncJobs();
