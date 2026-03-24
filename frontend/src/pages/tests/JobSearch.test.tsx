import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import JobSearch from '../JobSearch';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

describe('JobSearch Component', () => {
    it('fetches and renders job listings flawlessly template', async () => {
         (api.get as jest.Mock).mockImplementation((url: string) => {
             if (url.includes('/cv')) return Promise.resolve({ data: [{ id: 1, title: 'My CV' }] });
             if (url.includes('/jobs')) return Promise.resolve({ data: [{ id: 3, company_name: 'TestCorp', role_title: 'Software Dev', description: 'desc' }] });
             return Promise.resolve({ data: [] });
         });

         render(<MemoryRouter><JobSearch /></MemoryRouter>);

         await waitFor(() => expect(screen.getByText('TestCorp')).toBeInTheDocument());
         expect(screen.getByText('Software Dev')).toBeInTheDocument();
    });
    it('triggers Sync LanceDB refresh endpoint flawlessly', async () => {
         (api.get as jest.Mock).mockImplementation((url: string) => {
             if (url.includes('/cv')) return Promise.resolve({ data: [{ id: 1, title: 'My CV' }] });
             if (url.includes('/jobs')) return Promise.resolve({ data: [{ id: 3, role_title: 'TestCorp', description: 'desc' }] });
             return Promise.resolve({ data: [] });
         });
         (api.post as jest.Mock).mockResolvedValue({ data: { message: 'Sync complete', successCount: 1 } });

         const { getByText } = render(<MemoryRouter><JobSearch /></MemoryRouter>);
         // Wait for jobs to render and batch match to run or button to appear flaws
         await waitFor(() => expect(getByText('Sync Match Index')).toBeInTheDocument());

         const syncButton = getByText('Sync Match Index');
         syncButton.click();

         expect(api.post).toHaveBeenCalledWith('/search/sync-lancedb');
    });
});
