const { dbAsync } = require('./db');

async function test() {
    try {
        const resume = await dbAsync.get('SELECT content FROM Resumes ORDER BY id DESC LIMIT 1');
        if (resume) {
            console.log("=== RESUME CONTENT ===");
            console.log(resume.content);
        } else {
            console.log("No resumes found in DB");
        }
    } catch (err) {
        console.error(err.message);
    }
}

test();
