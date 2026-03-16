import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import JobSearch from '../JobSearch';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

describe('JobSearch Component', () => {
    it('fetches and renders job listings flawlessly template', async () => {
         (api.get as jest.Mock).mockResolvedValueOnce({ 
             data: [
                 { id: 1, company_name: 'TestCorp', role_title: 'Software Dev', location: 'Remote', salary_range: '$100k', description: 'Cool job', apply_link: 'http://test.com' }
             ] 
         });

         render(<JobSearch />);

         await waitFor(() => expect(screen.getByText('TestCorp')).toBeInTheDocument());
         expect(screen.getByText('Software Dev')).toBeInTheDocument();
    });
});
