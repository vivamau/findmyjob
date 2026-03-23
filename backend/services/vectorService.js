const { getVectorDb } = require('../db/vectorDb');
const { generateEmbedding } = require('./aiService');

const JOBS_TABLE = 'jobs_vectors';
const CV_TABLE = 'cv_vectors';

/**
 * Generates an embedding for a job and saves it to LanceDB.
 * Used for building the semantic search index.
 */
async function indexJob(jobId, title, descriptionText) {
    try {
        const db = await getVectorDb();
        const embedding = await generateEmbedding(`${title} \n ${descriptionText}`);
        
        if (!embedding || embedding.length === 0) {
            console.warn(`[IndexJob] Failed to generate embedding for job ${jobId}. Ensure embedding model is functional.`);
            return false;
        }

        const record = [{
            vector: embedding,
            job_id: jobId,
            title: title || '',
            text_snippet: (descriptionText || '').substring(0, 200) // Storing snippet for quick context mapping
        }];

        const tableNames = await db.tableNames();
        if (tableNames.includes(JOBS_TABLE)) {
            const tbl = await db.openTable(JOBS_TABLE);
            // Replace existing if updating (Wait: lancedb node package requires delete then add, or if we use string IDs, we can update. For simplicity, we just add for now or wipe the old record).
            // Currently LanceDB supports deletion. Let's delete old record if it exists.
            try {
                await tbl.delete(`job_id = ${typeof jobId === 'string' ? `'${jobId}'` : jobId}`);
            } catch (e) { /* ignore delete error if missing */ }
            
            await tbl.add(record);
        } else {
            // First time table creation
            await db.createTable(JOBS_TABLE, record);
        }
        
        console.log(`[IndexJob] Successfully indexed Job ID ${jobId}`);
        return true;
    } catch (err) {
        console.error(`[IndexJob] Error indexing job ${jobId}:`, err);
        return false;
    }
}

/**
 * Searches the LanceDB jobs table using a semantic text query.
 */
async function searchJobs(queryText, limit = 5) {
     try {
         const db = await getVectorDb();
         const tableNames = await db.tableNames();
         
         if (!tableNames.includes(JOBS_TABLE)) {
             console.warn('[SearchJobs] Jobs vector table does not exist yet. Please index some jobs.');
             return [];
         }

         const queryVector = await generateEmbedding(queryText);
         if (!queryVector || queryVector.length === 0) {
             throw new Error('Could not generate query embedding');
         }

         const tbl = await db.openTable(JOBS_TABLE);
         // Execute similarity search
         const results = await tbl.search(queryVector).limit(limit).toArray();
         
         return results.map(r => ({
             job_id: r.job_id,
             title: r.title,
             snippet: r.text_snippet,
             distance: r._distance // Lower distance is closer
         }));
     } catch(err) {
         console.error('[SearchJobs] Error searching jobs:', err);
         return [];
     }
}

module.exports = {
   indexJob,
   searchJobs,
   JOBS_TABLE,
   CV_TABLE
};
