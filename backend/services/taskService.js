const { randomUUID } = require('crypto');
const { dbAsync } = require('../db');

async function createTask(type, label, model = null) {
    const id = randomUUID();
    await dbAsync.run(
        `INSERT INTO BackgroundTasks (id, type, label, status, progress, model) VALUES (?, ?, ?, 'running', 0, ?)`,
        [id, type, label, model]
    );
    return id;
}

async function updateTask(id, { status, progress, detail, error, result } = {}) {
    const fields = [];
    const values = [];

    if (status !== undefined)   { fields.push('status = ?');   values.push(status); }
    if (progress !== undefined) { fields.push('progress = ?'); values.push(progress); }
    if (detail !== undefined)   { fields.push('detail = ?');   values.push(detail); }
    if (error !== undefined)    { fields.push('error = ?');    values.push(error); }
    if (result !== undefined)   { fields.push('result = ?');   values.push(JSON.stringify(result)); }

    fields.push("updated_at = datetime('now')");

    if (fields.length === 1) return; // only timestamp, nothing to update
    values.push(id);
    await dbAsync.run(`UPDATE BackgroundTasks SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function getTask(id) {
    const row = await dbAsync.get('SELECT * FROM BackgroundTasks WHERE id = ?', [id]);
    if (!row) return null;
    return {
        ...row,
        result: row.result ? JSON.parse(row.result) : null
    };
}

async function getRecentTasks(limit = 20) {
    const rows = await dbAsync.all(
        `SELECT id, type, label, model, status, progress, detail, error, created_at, updated_at
         FROM BackgroundTasks ORDER BY created_at DESC LIMIT ?`,
        [limit]
    );
    return rows;
}

// Mark any tasks still in 'running' state as errored (handles server restarts)
async function recoverStaleTasks() {
    await dbAsync.run(
        `UPDATE BackgroundTasks SET status = 'error', error = 'Server restarted'
         WHERE status = 'running'`
    );
}

// Fire an async operation in the background without blocking the caller.
// Catches all errors and updates the task record accordingly.
function runInBackground(taskId, fn) {
    Promise.resolve()
        .then(() => fn())
        .catch(async (err) => {
            console.error(`[BackgroundTask ${taskId}] Unhandled error:`, err.message);
            try {
                await updateTask(taskId, { status: 'error', error: err.message, progress: 0 });
            } catch (dbErr) {
                console.error(`[BackgroundTask ${taskId}] Failed to update error state:`, dbErr.message);
            }
        });
}

async function cancelTask(id) {
    await dbAsync.run(
        `UPDATE BackgroundTasks SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND status = 'running'`,
        [id]
    );
}

// Call this inside background loops to check if the task was cancelled.
// Returns true if the task should stop.
async function isCancelled(id) {
    const row = await dbAsync.get('SELECT status FROM BackgroundTasks WHERE id = ?', [id]);
    return row?.status === 'cancelled';
}

module.exports = { createTask, updateTask, getTask, getRecentTasks, recoverStaleTasks, runInBackground, cancelTask, isCancelled };
