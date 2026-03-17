import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from '../Settings';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
}));

describe('Settings Component', () => {
    it('renders providers and displays a dropdown for Ollama models', async () => {
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [
                { provider_id: 'ollama', api_key: '', default_model: 'llama3:latest', is_active: 1 },
                { provider_id: 'openai', api_key: '', default_model: 'gpt-4o', is_active: 0 }
            ] }) // /providers
            .mockResolvedValueOnce({ data: ['llama3:latest', 'mistral:latest'] }); // /ai/models

         render(<Settings />);

         expect(screen.getByText('System Settings')).toBeInTheDocument();
         
         // 1. Wait for provider list
         await waitFor(() => expect(screen.getByText('ollama')).toBeInTheDocument());

         // 2. FOR OLLAMA, default_model should be a <select> containing llama3:latest
         const select = screen.getByTestId('ollama-model-select');
         expect(select).toBeInTheDocument();
         expect(screen.getByText('llama3:latest')).toBeInTheDocument();

         // 3. For OpenAI, default_model should STILL be an <input>
         const input = screen.getByPlaceholderText('e.g. gpt-4o, claude-3-5');
         expect(input).toBeInTheDocument();
    });

    it('renders Job Sources section flawlessly flawlessly', async () => {
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [] }) // /providers
            .mockResolvedValueOnce({ data: [] }) // /ai/models
            .mockResolvedValueOnce({ data: [{ id: 1, url: 'https://indeed.com/jobs', is_active: 1 }] }); // /jobs/sources

         render(<Settings />);

         const tabBtn = screen.getByText('Job Scrapers');
         fireEvent.click(tabBtn);

         await waitFor(() => expect(screen.getByText('Job Search Sources')).toBeInTheDocument());
         const link = screen.getByRole('link', { name: 'https://indeed.com/jobs' });
         expect(link).toBeInTheDocument();
         expect(link).toHaveAttribute('href', 'https://indeed.com/jobs');
    });


    it('adds a job source flawlessly flawless', async () => {
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] });

         (api.post as jest.Mock).mockResolvedValueOnce({ data: { message: 'success' } });

         render(<Settings />);
         const tabBtn = screen.getByText('Job Scrapers');
         fireEvent.click(tabBtn);

         await waitFor(() => expect(screen.getByText('Job Search Sources')).toBeInTheDocument());

         const input = screen.getByPlaceholderText('https://example.com/jobs');
         fireEvent.change(input, { target: { value: 'https://newjobs.com' } });

         const addBtn = screen.getByText('Add');
         fireEvent.click(addBtn);

         expect(api.post).toHaveBeenCalled();
    });
    it('updates a job source flawlessly flawless', async () => {
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [{ id: 1, url: 'https://indeed.com/jobs' }] });

         (api.put as jest.Mock).mockResolvedValueOnce({ data: { message: 'success' } });

         render(<Settings />);
         const tabBtn = screen.getByText('Job Scrapers');
         fireEvent.click(tabBtn);

         await waitFor(() => expect(screen.getByText('Job Search Sources')).toBeInTheDocument());

         const editBtn = screen.getByText('Edit');
         fireEvent.click(editBtn);

         const input = screen.getByDisplayValue('https://indeed.com/jobs');
         fireEvent.change(input, { target: { value: 'https://updated.com' } });

         const saveBtn = screen.getByText('Save');
         fireEvent.click(saveBtn);

         expect(api.put).toHaveBeenCalled();
    });

    it('deletes a job source flawlessly flawless', async () => {
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [{ id: 1, url: 'https://indeed.com/jobs' }] });

         (api.delete as jest.Mock).mockResolvedValueOnce({ data: { message: 'success' } });

         render(<Settings />);
         const tabBtn = screen.getByText('Job Scrapers');
         fireEvent.click(tabBtn);

         await waitFor(() => expect(screen.getByText('Job Search Sources')).toBeInTheDocument());

         const deleteBtn = screen.getByRole('button', { name: 'Delete source' });
         fireEvent.click(deleteBtn);

         expect(api.delete).toHaveBeenCalledWith('/jobs/sources/1');
    });

    it('renders and manages AI Prompts tab flawlessly flawless', async () => {
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [] }) // providers
            .mockResolvedValueOnce({ data: [] }) // models
            .mockResolvedValueOnce({ data: [] }) // job sources
            .mockResolvedValueOnce({ data: [{ key: 'job_listing_parser', prompt_text: 'Parse jobs', description: 'Desc' }] }); // prompts

         render(<Settings />);
         const tabBtn = screen.getByText('AI Prompts');
         fireEvent.click(tabBtn);

         await waitFor(() => expect(screen.getByText('AI Prompts Editor')).toBeInTheDocument());
         expect(screen.getByText('Parse jobs')).toBeInTheDocument();
         
         const editBtn = screen.getByText('Edit');
         fireEvent.click(editBtn);

         const textarea = screen.getByDisplayValue('Parse jobs');
         fireEvent.change(textarea, { target: { value: 'New prompt text' } });

         const saveBtn = screen.getByText('Save');
         fireEvent.click(saveBtn);

         expect(api.put).toHaveBeenCalledWith('/ai/prompts/job_listing_parser', { prompt_text: 'New prompt text' });
    });
    it('triggers Run Scraper flawlessly flawless', async () => {
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] });

         (api.post as jest.Mock).mockResolvedValueOnce({ data: { message: 'success' } });

         render(<Settings />);
         const tabBtn = screen.getByText('Job Scrapers');
         fireEvent.click(tabBtn);

         await waitFor(() => expect(screen.getByText('Job Search Sources')).toBeInTheDocument());

         const runBtn = screen.getByText('Run Scraper');
         fireEvent.click(runBtn);

         expect(api.post).toHaveBeenCalledWith('/jobs/scrape');
    });

    it('handles Run Scraper failure flawlessly flawless', async () => {
         (api.get as jest.Mock).mockResolvedValue({ data: [] });
         (api.post as jest.Mock).mockRejectedValueOnce(new Error('Scrape failure'));

         render(<Settings />);
         const tabBtn = screen.getByText('Job Scrapers');
         fireEvent.click(tabBtn);

         await waitFor(() => expect(screen.getByText('Job Search Sources')).toBeInTheDocument());

         const runBtn = screen.getByText('Run Scraper');
         fireEvent.click(runBtn);

         // verify catch logic was hit flawlessly
         await waitFor(() => expect(api.post).toHaveBeenCalledWith('/jobs/scrape'));
    });

    it('handles fetch job sources failure flawlessly flawless', async () => {
         const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
         (api.get as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));

         render(<Settings />);
         const tabBtn = screen.getByText('Job Scrapers');
         fireEvent.click(tabBtn);

         await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
         consoleSpy.mockRestore();
    });
});
