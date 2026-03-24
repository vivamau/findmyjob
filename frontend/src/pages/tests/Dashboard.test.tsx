import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import api from '../../utils/api';

// Mock the axios api instance
jest.mock('../../utils/api', () => ({
  get: jest.fn()
}));

describe('Dashboard Component', () => {
    it('renders and displays active resumes list', async () => {
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: { status: 'ok' } }) // /health
            .mockResolvedValueOnce({ data: [{ id: 1, title: 'Mock CV', creates_at: '2023-10-24', last_parse_at: '2023-10-24T12:00:00Z', parse_model: 'llama3' }] }); 

         render(<MemoryRouter><Dashboard /></MemoryRouter>);

         expect(screen.getByText('Dashboard')).toBeInTheDocument();
         
         await waitFor(() => {
             expect(screen.getByText('Mock CV')).toBeInTheDocument();
         });

         expect(screen.getByText(/Last Parse: 24 Oct 2023/)).toBeInTheDocument();
    });
});
