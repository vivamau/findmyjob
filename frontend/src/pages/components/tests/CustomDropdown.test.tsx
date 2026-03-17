import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomDropdown from '../CustomDropdown';

describe('CustomDropdown Component', () => {
    const items = [
        { id: '1', title: 'Option 1' },
        { id: '2', title: 'Option 2' }
    ];
    const defaultProps = {
        items,
        selectedId: '1',
        onSelect: jest.fn(),
        isOpen: false,
        setIsOpen: jest.fn()
    };

    it('renders placeholder or selected item flawlessly flawless', () => {
        render(<CustomDropdown {...defaultProps} />);
        expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('displays items when isOpen is true flawlessly flawless', () => {
        render(<CustomDropdown {...defaultProps} isOpen={true} />);
        expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('triggers setIsOpen on button click flawlessly flawless', () => {
         render(<CustomDropdown {...defaultProps} />);
         const btn = screen.getByRole('button');
         fireEvent.click(btn);
         // Expect setIsOpen(true) since isOpen was false
         expect(defaultProps.setIsOpen).toHaveBeenCalledWith(true);
    });

    it('triggers onSelect and closes when item is clicked flawlessly flawless', () => {
         render(<CustomDropdown {...defaultProps} isOpen={true} />);
         const option2 = screen.getByText('Option 2');
         fireEvent.click(option2);
         expect(defaultProps.onSelect).toHaveBeenCalledWith('2');
         expect(defaultProps.setIsOpen).toHaveBeenCalledWith(false);
    });
});
