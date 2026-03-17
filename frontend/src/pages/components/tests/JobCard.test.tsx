import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import JobCard from '../JobCard';
import api from '../../../utils/api';

jest.mock('../../../utils/api', () => ({
    post: jest.fn()
}));

describe('JobCard Component', () => {
    const mockJob = {
        id: 1,
        company_name: 'Test Corp',
        role_title: 'Software Engineer',
        location: 'Remote',
        salary_range: '$100k',
        description: 'Job description text.',
        apply_link: 'https://apply.com',
        created_at: '2026-03-17'
    };

    it('renders basic job details flawlessly flawless', () => {
        render(<JobCard job={mockJob} selectedCvId="1" />);
        expect(screen.getByText('Software Engineer')).toBeInTheDocument();
        expect(screen.getByText('Test Corp')).toBeInTheDocument();
    });

    it('triggers AI match compute flawlessly flawless and saves scores', async () => {
         (api.post as jest.Mock).mockResolvedValueOnce({
             data: { match_score: 85, matching_tags: ['React', 'TS'], summary_analysis: 'Good match description' }
         });

         render(<JobCard job={mockJob} selectedCvId="2" />);
         const matchBtn = screen.getByText('Compute AI Match Score');
         fireEvent.click(matchBtn);

         await waitFor(() => expect(screen.getByText('85%')).toBeInTheDocument());
         expect(screen.getByText('React')).toBeInTheDocument();
         expect(screen.getByText('Good match description')).toBeInTheDocument();
    });
});
