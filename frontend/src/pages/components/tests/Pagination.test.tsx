import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pagination from '../Pagination';

describe('Pagination Component', () => {
    const defaultProps = {
        currentPage: 1,
        totalPages: 5,
        indexOfFirstItem: 0,
        indexOfLastItem: 10,
        totalItems: 50,
        onPageChange: jest.fn()
    };

    it('renders and displays correct showing text', () => {
        render(<Pagination {...defaultProps} />);
        expect(screen.getByText('Showing 1 to 10 of 50 results')).toBeInTheDocument();
    });

    it('renders all page numbers when totalPages <= 7', () => {
        render(<Pagination {...defaultProps} />);
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    it('renders ellipses when totalPages > 7 and triggers mid branches', () => {
        // Case: currentPage <= 4
        render(<Pagination {...defaultProps} totalPages={10} currentPage={2} />);
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('...')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('renders ellipses for end branch when currentPage >= totalPages - 3', () => {
        render(<Pagination {...defaultProps} totalPages={10} currentPage={8} />);
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('...')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('renders ellipses both sides for mid branch when inside range', () => {
        render(<Pagination {...defaultProps} totalPages={10} currentPage={5} />);
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getAllByText('...')).toHaveLength(2);
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('triggers onPageChange on clicking page numbers', () => {
        render(<Pagination {...defaultProps} />);
        fireEvent.click(screen.getByText('3'));
        expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
    });

    it('disables previous button on first page', () => {
        render(<Pagination {...defaultProps} currentPage={1} />);
        const buttons = screen.getAllByRole('button');
        const prevBtn = buttons[0]; // first is prev, last is next
        expect(prevBtn).toBeDisabled();
    });

    it('disables next button on last page', () => {
        render(<Pagination {...defaultProps} currentPage={5} />);
        const buttons = screen.getAllByRole('button');
        const nextBtn = buttons[buttons.length - 1]; 
        expect(nextBtn).toBeDisabled();
    });
});
