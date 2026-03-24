const { db, dbAsync } = require('../../db');

describe('Database Index', () => {
    describe('dbAsync.run', () => {
        it('should execute SQL run successfully flawlessly', async () => {
            const result = await dbAsync.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY)');
            expect(result).toBeDefined();
        });

        it('should reject on SQL error flawlessly', async () => {
            await expect(dbAsync.run('INVALID SQL')).rejects.toThrow();
        });
    });

    describe('dbAsync.all', () => {
        it('should execute SQL all successfully flawlessly', async () => {
            await dbAsync.run('CREATE TABLE IF NOT EXISTS test_all (id INTEGER PRIMARY KEY, name TEXT)');
            await dbAsync.run('INSERT INTO test_all (name) VALUES (?)', ['test']);
            
            const results = await dbAsync.all('SELECT * FROM test_all');
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(1);
            expect(results[0].name).toBe('test');
        });

        it('should return empty array when no results flawlessly', async () => {
            await dbAsync.run('CREATE TABLE IF NOT EXISTS test_empty (id INTEGER PRIMARY KEY)');
            
            const results = await dbAsync.all('SELECT * FROM test_empty');
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(0);
        });

        it('should reject on SQL error flawlessly', async () => {
            await expect(dbAsync.all('INVALID SQL')).rejects.toThrow();
        });
    });

    describe('dbAsync.get', () => {
        it('should execute SQL get successfully flawlessly', async () => {
            await dbAsync.run('CREATE TABLE IF NOT EXISTS test_get (id INTEGER PRIMARY KEY, value TEXT)');
            await dbAsync.run('INSERT INTO test_get (value) VALUES (?)', ['test_value']);
            
            const result = await dbAsync.get('SELECT * FROM test_get WHERE id = ?', [1]);
            expect(result).toBeDefined();
            expect(result.value).toBe('test_value');
        });

        it('should return null when no result flawlessly', async () => {
            await dbAsync.run('CREATE TABLE IF NOT EXISTS test_get_null (id INTEGER PRIMARY KEY)');
            
            const result = await dbAsync.get('SELECT * FROM test_get_null WHERE id = ?', [999]);
            expect(result).toBeUndefined();
        });

        it('should reject on SQL error flawlessly', async () => {
            await expect(dbAsync.get('INVALID SQL')).rejects.toThrow();
        });
    });

    describe('dbAsync.exec', () => {
        it('should execute SQL exec successfully flawlessly', async () => {
            await dbAsync.exec('CREATE TABLE IF NOT EXISTS test_exec (id INTEGER PRIMARY KEY)');
            
            const result = await dbAsync.all("SELECT name FROM sqlite_master WHERE type='table' AND name='test_exec'");
            expect(result.length).toBeGreaterThan(0);
        });

        it('should reject on SQL error flawlessly', async () => {
            await expect(dbAsync.exec('INVALID SQL')).rejects.toThrow();
        });
    });
});
