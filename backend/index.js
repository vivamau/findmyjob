const app = require('./app');
const runMigrations = require('./scripts/run_migrations');
const seedUserRoles = require('./scripts/seed_userroles');
const seedUsers = require('./scripts/seed_users');
const { recoverStaleTasks } = require('./services/taskService');

const PORT = process.env.PORT || 3000;

async function start() {
    try {
        await runMigrations();
        await recoverStaleTasks();
        await seedUserRoles();
        await seedUsers();
        // console.log("Database initialized successfully");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

if (require.main === module) {
    start();
}

module.exports = start;
