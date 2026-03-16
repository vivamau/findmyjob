import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    indexOfFirstItem: number;
    indexOfLastItem: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({
    currentPage,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    totalItems,
    onPageChange,
}: PaginationProps) {
    
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                pages.push(1, 2, 3, 4, 5, '...', totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/5 animate-fade-in">
            <span className="text-sm text-secondary">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} results
            </span>
            <div className="flex items-center gap-1">
                <button 
                    className="btn btn-secondary px-2 py-1 text-xs" 
                    disabled={currentPage === 1} 
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    <ChevronLeft size={14} />
                </button>

                {getPageNumbers().map((p, i) => (
                    <button 
                        key={i} 
                        className={`btn px-2 py-1 text-xs font-medium ${p === currentPage ? 'btn-primary' : 'btn-secondary'} ${p === '...' ? 'cursor-default opacity-50' : ''}`} 
                        onClick={() => typeof p === 'number' && onPageChange(p)}
                        disabled={p === '...'}
                    >
                        {p}
                    </button>
                ))}

                <button 
                    className="btn btn-secondary px-2 py-1 text-xs" 
                    disabled={currentPage === totalPages} 
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
