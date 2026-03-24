const { getVectorDb } = require('../../db/vectorDb');

describe('VectorDb - Simple Tests', () => {
    describe('getVectorDb', () => {
        it('should return vector db connection flawlessly', async () => {
            const db = await getVectorDb();
            expect(db).toBeDefined();
        });
    });
});
