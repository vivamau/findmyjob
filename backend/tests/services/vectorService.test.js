const vectorService = require('../../services/vectorService');
const aiService = require('../../services/aiService');

jest.mock('../../services/aiService', () => ({
    generateEmbedding: jest.fn()
}));

describe('VectorService with LanceDB', () => {
    // We use a predefined vector size of 128 (arbitrary for testing mocked responses)
    const fakeJobVector = Array.from({length: 128}, () => Math.random());
    const fakeQueryVector = [...fakeJobVector]; // Same vector to ensure similarity match

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should index a job correctly', async () => {
        aiService.generateEmbedding.mockResolvedValue(fakeJobVector);
        
        const result = await vectorService.indexJob('test-id-123', 'Software Engineer', 'React Node Developer');
        expect(result).toBe(true);
        expect(aiService.generateEmbedding).toHaveBeenCalledWith('Software Engineer \n React Node Developer');
    });

    it('should search mapped vectors and return the closest match', async () => {
        // First ensure it's indexed
        aiService.generateEmbedding.mockResolvedValue(fakeJobVector);
        await vectorService.indexJob('test-id-search', 'Data Scientist', 'Python SQL');

        // Now search
        aiService.generateEmbedding.mockResolvedValue(fakeQueryVector);
        const results = await vectorService.searchJobs('Data Engineer', 5);

        expect(results).toBeDefined();
        // Since LanceDB is persistent, it might return multiple things. But it should definitely find our indexed one.
        expect(results.length).toBeGreaterThan(0);
        console.log('Search Results:', results);
        
        const topHit = results.find(r => r.job_id === 'test-id-search');
        expect(topHit).toBeDefined();
        expect(topHit.title).toBe('Data Scientist');
    });
});
