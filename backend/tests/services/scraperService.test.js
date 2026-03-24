const { scrapeDynamicPage } = require('../../services/scraperService');

// Mock puppeteer
jest.mock('puppeteer', () => ({
    launch: jest.fn()
}));

const puppeteer = require('puppeteer');

describe('ScraperService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('scrapeDynamicPage', () => {
        it('should scrape a page successfully flawlessly', async () => {
            const mockPage = {
                setUserAgent: jest.fn(),
                setViewport: jest.fn(),
                goto: jest.fn(),
                content: jest.fn().mockResolvedValue('<html>Test Content</html>')
            };
            const mockBrowser = {
                newPage: jest.fn().mockResolvedValue(mockPage),
                close: jest.fn()
            };

            puppeteer.launch.mockResolvedValue(mockBrowser);

            const html = await scrapeDynamicPage('https://example.com');

            expect(html).toBe('<html>Test Content</html>');
            expect(mockPage.setUserAgent).toHaveBeenCalled();
            expect(mockPage.setViewport).toHaveBeenCalled();
            expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle2', timeout: 60000 });
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should handle scraping errors flawlessly', async () => {
            const mockBrowser = {
                newPage: jest.fn().mockRejectedValue(new Error('Browser launch failed')),
                close: jest.fn()
            };

            puppeteer.launch.mockResolvedValue(mockBrowser);

            await expect(scrapeDynamicPage('https://example.com')).rejects.toThrow('Browser launch failed');
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should close browser even on error flawlessly', async () => {
            const mockPage = {
                setUserAgent: jest.fn(),
                setViewport: jest.fn(),
                goto: jest.fn().mockRejectedValue(new Error('Navigation failed')),
                content: jest.fn()
            };
            const mockBrowser = {
                newPage: jest.fn().mockResolvedValue(mockPage),
                close: jest.fn()
            };

            puppeteer.launch.mockResolvedValue(mockBrowser);

            await expect(scrapeDynamicPage('https://example.com')).rejects.toThrow('Navigation failed');
            expect(mockBrowser.close).toHaveBeenCalled();
        });
    });
});
