import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CVManager from '../CVManager';
import api from '../../utils/api';

// Mock the axios api instance
jest.mock('../../utils/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
}));

describe('CVManager Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (api.get as jest.Mock).mockResolvedValue({ data: [] });
    });

    it('renders the list view initially', async () => {
        (api.get as jest.Mock)
           .mockResolvedValueOnce({ data: [{ id: 1, title: 'Tech CV v2', created_at: '2023-10-24' }] })
           .mockResolvedValue({ data: [{ provider_id: 'ollama', default_model: 'llama3', is_active: 1 }] }); // handles providers next
        
        render(<CVManager />);
        expect(screen.getByText('CV Management')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText('Tech CV v2')).toBeInTheDocument();
        });

        // Click view data to open drawer
        const viewBtn = screen.getByText('View Data');
        fireEvent.click(viewBtn);

        await waitFor(() => {
            expect(screen.getByText('ollama (llama3)')).toBeInTheDocument();
        });
    });

    it('switches to the upload tab and submits a file', async () => {
        render(<CVManager />);

        const importBtn = screen.getByText('Import CV');
        fireEvent.click(importBtn);

        // verify we are in upload tab view
        expect(screen.getByText('Import your CV')).toBeInTheDocument();

        // create a fake file
        const file = new File(['hello'], 'resume.pdf', { type: 'application/pdf' });
        const input = screen.getByLabelText('file-input');

        // trigger file attachment
        fireEvent.change(input, { target: { files: [file] } });

        // set title field index
        const titleInput = screen.getByPlaceholderText('CV Title (e.g. Frontend Specialist)');
        fireEvent.change(titleInput, { target: { value: 'My Test CV' } });

        const submitBtn = screen.getByText('Upload and Parse');
        
        // Mock successful post response
        (api.post as jest.Mock).mockResolvedValueOnce({ data: { id: 1, message: 'CV uploaded and saved successfully' } });

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalled();
            expect(screen.getByText('CV Management')).toBeInTheDocument();
        });
    });

    it('loads and displays details including experiences on select', async () => {
         const mockCv = { id: 1, title: 'Mock CV', created_at: '2023-10-24', content: 'Sample text' };
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [mockCv] }) // initial load list
            .mockResolvedValueOnce({ data: [] }) // models lists
            .mockResolvedValueOnce({ data: [{ id: 1, role_title: 'Engineer', company_name: 'Co A' }] }) // experiences load
            .mockResolvedValueOnce({ data: [{ id: 1, institution_name: 'Uni A', degree_title: 'BSc' }] }) // educations load
            .mockResolvedValueOnce({ data: [{ id: 1, language_name: 'English', proficiency_level: 'Native' }] }); // languages load

         render(<CVManager />);

         await waitFor(() => {
             expect(screen.getByText('Mock CV')).toBeInTheDocument();
         });

         const viewBtn = screen.getByText('View Data');
         fireEvent.click(viewBtn);

         await waitFor(() => {
             expect(screen.getByText('Engineer')).toBeInTheDocument();
             expect(screen.getByText('Uni A')).toBeInTheDocument();
             expect(screen.getByText('English')).toBeInTheDocument();
         });
    });

    it('can delete a CV from the list views', async () => {
         const mockCv = { id: 1, title: 'CV to Delete', created_at: '2023-10-24' };
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [mockCv] }) // initial load
            .mockResolvedValueOnce({ data: [] }); // models

         window.confirm = jest.fn().mockReturnValue(true);
         (api.delete as jest.Mock) = jest.fn().mockResolvedValueOnce({ data: { message: 'Deleted' } });

         render(<CVManager />);

         await waitFor(() => {
             expect(screen.getByText('CV to Delete')).toBeInTheDocument();
         });

         const deleteBtns = screen.getAllByRole('button');
         // find the button wrapping Trash2 or containing specific class triggers
         // Actually we can query
         const trashBtn = deleteBtns.find(b => b.className.includes('text-error'));
         if (trashBtn) fireEvent.click(trashBtn);

         // 2. Click confirms Delete inside Modal
         await waitFor(() => {
             expect(screen.getByText('Delete CV?')).toBeInTheDocument();
         });

         const confirmBtn = screen.getByRole('button', { name: 'Delete' });
         fireEvent.click(confirmBtn);

         await waitFor(() => {
             expect(api.delete).toHaveBeenCalledWith('/cv/1');
             expect(screen.queryByText('CV to Delete')).not.toBeInTheDocument();
         });
    });

    it('triggers AI parse on button click', async () => {
         const mockCv = { id: 1, title: 'Mock CV', created_at: '2023-10-24', content: 'text' };
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [mockCv] }) // initial list
            .mockResolvedValueOnce({ data: ['qwen3.5:9b'] }) // model list fetches
            .mockResolvedValueOnce({ data: [] }) // initial experiences
            .mockResolvedValueOnce({ data: [] }) // educations
            .mockResolvedValueOnce({ data: [] }); // languages

         (api.post as jest.Mock).mockResolvedValueOnce({ data: { message: 'Success' } });

         render(<CVManager />);

         await waitFor(() => expect(screen.getByText('Mock CV')).toBeInTheDocument());

         const viewBtn = screen.getByText('View Data');
         fireEvent.click(viewBtn);

         await waitFor(() => expect(screen.getByText('Run AI Parse')).toBeInTheDocument());

         const parseBtn = screen.getByText('Run AI Parse');
         fireEvent.click(parseBtn);
         await waitFor(() => expect(screen.getByText('Overwrite Data?')).toBeInTheDocument());
         fireEvent.click(screen.getByRole('button', { name: 'Parse' }));
         await waitFor(() => {
             expect(api.post).toHaveBeenCalled();
         });
    });

    it('displays an alert if AI parse fails', async () => {
         const mockCv = { id: 1, title: 'Mock CV', created_at: '2023-10-24', content: 'text' };
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [mockCv] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }); 

         (api.post as jest.Mock).mockRejectedValueOnce({ 
             response: { data: { error: 'Broken model' } } 
         });
         
         const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

         render(<CVManager />);

         await waitFor(() => expect(screen.getByText('Mock CV')).toBeInTheDocument());
         fireEvent.click(screen.getByText('View Data'));
          await waitFor(() => expect(screen.getByText('Run AI Parse')).toBeInTheDocument());
          fireEvent.click(screen.getByText('Run AI Parse'));
          await waitFor(() => expect(screen.getByText('Overwrite Data?')).toBeInTheDocument());
          fireEvent.click(screen.getByRole('button', { name: 'Parse' }));
          await waitFor(() => {
              expect(alertMock).toHaveBeenCalledWith('AI parsing failed: Broken model');
          });
         
         alertMock.mockRestore();
    });

    it('can edit and save an experience record', async () => {
         const mockCv = { id: 1, title: 'Mock CV', created_at: '2023-10-24', content: 'text' };
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [mockCv] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [{ id: 10, role_title: 'Junior Dev', company_name: 'Co X' }] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }); 

         (api.put as jest.Mock).mockResolvedValueOnce({ data: { message: 'Updated' } });

         render(<CVManager />);

         await waitFor(() => expect(screen.getByText('Mock CV')).toBeInTheDocument());
         fireEvent.click(screen.getByText('View Data'));

         await waitFor(() => expect(screen.getByText('Junior Dev')).toBeInTheDocument());
         
         const editBtn = screen.getByText('Edit');
         fireEvent.click(editBtn);

         // Input should appear
         const roleInput = screen.getByPlaceholderText('Role');
         fireEvent.change(roleInput, { target: { value: 'Senior Dev' } });

         const saveBtn = screen.getByText('Save');
         fireEvent.click(saveBtn);

         await waitFor(() => {
             expect(api.put).toHaveBeenCalledWith('/cv/experiences/10', expect.objectContaining({ role_title: 'Senior Dev' }));
         });
    });

    it('can edit and save an education record', async () => {
         const mockCv = { id: 1, title: 'Mock CV', created_at: '2023-10-24', content: 'text' };
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [mockCv] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [{ id: 20, institution_name: 'Uni X', degree_title: 'BSc' }] }) 
            .mockResolvedValueOnce({ data: [] }); 

         (api.put as jest.Mock).mockResolvedValueOnce({ data: { message: 'Updated' } });

         render(<CVManager />);

         await waitFor(() => expect(screen.getByText('Mock CV')).toBeInTheDocument());
         fireEvent.click(screen.getByText('View Data'));

         await waitFor(() => expect(screen.getByText('Uni X')).toBeInTheDocument());
         
         const editBtns = screen.getAllByText('Edit');
         fireEvent.click(editBtns[0]); // Education Edit button

         const instInput = screen.getByPlaceholderText('Institution');
         fireEvent.change(instInput, { target: { value: 'Uni Y' } });

         const saveBtn = screen.getByText('Save');
         fireEvent.click(saveBtn);

         await waitFor(() => {
             expect(api.put).toHaveBeenCalledWith('/cv/educations/20', expect.objectContaining({ institution_name: 'Uni Y' }));
         });
    });

    it('can edit and save a language record', async () => {
         const mockCv = { id: 1, title: 'Mock CV', created_at: '2023-10-24', content: 'text' };
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [mockCv] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [{ id: 30, language_name: 'English', proficiency_level: 'Native' }] }); 

         (api.put as jest.Mock).mockResolvedValueOnce({ data: { message: 'Updated' } });

         render(<CVManager />);

         await waitFor(() => expect(screen.getByText('Mock CV')).toBeInTheDocument());
         fireEvent.click(screen.getByText('View Data'));

         await waitFor(() => expect(screen.getByText('English')).toBeInTheDocument());
         
         const editBtns = screen.getAllByText('Edit');
         fireEvent.click(editBtns[0]); // Language Edit button

         const langInput = screen.getByPlaceholderText('Language');
         fireEvent.change(langInput, { target: { value: 'French' } });

         const saveBtn = screen.getByText('Save');
         fireEvent.click(saveBtn);

         await waitFor(() => {
             expect(api.put).toHaveBeenCalledWith('/cv/languages/30', expect.objectContaining({ language_name: 'French' }));
         });
    });

    it('can cancel the AI parse overwrite modal', async () => {
         const mockCv = { id: 1, title: 'Mock CV', created_at: '2023-10-24', content: 'text' };
         (api.get as jest.Mock)
            .mockResolvedValueOnce({ data: [mockCv] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }) 
            .mockResolvedValueOnce({ data: [] }); 

         render(<CVManager />);

         await waitFor(() => expect(screen.getByText('Mock CV')).toBeInTheDocument());
         fireEvent.click(screen.getByText('View Data'));

         await waitFor(() => expect(screen.getByText('Run AI Parse')).toBeInTheDocument());
         fireEvent.click(screen.getByText('Run AI Parse'));

         // Modal Opens
         await waitFor(() => expect(screen.getByText('Overwrite Data?')).toBeInTheDocument());
         
         const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
         fireEvent.click(cancelBtn);

         // Modal Closes
         await waitFor(() => expect(screen.queryByText('Overwrite Data?')).not.toBeInTheDocument());
    });
});
