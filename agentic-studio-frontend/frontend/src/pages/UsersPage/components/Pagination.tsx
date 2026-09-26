import React from 'react';
import type { PaginationProps } from '../Users';

export const Pagination: React.FC<PaginationProps> = React.memo(({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPrevious,
  onNext,
  onPageChange
}) => {
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show sliding window of pages
      if (currentPage <= 3) {
        // Show first 5 pages
        for (let i = 1; i <= maxVisiblePages; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        // Show last 5 pages
        for (let i = totalPages - maxVisiblePages + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show pages around current page
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        <span className="body-small">
          Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} users
        </span>
      </div>
      <div className="pagination-controls">
        <button 
          className="pagination-btn"
          onClick={onPrevious}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          Previous
        </button>
        
        <div className="pagination-pages">
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Go to page ${pageNum}`}
              aria-current={currentPage === pageNum ? 'page' : undefined}
            >
              {pageNum}
            </button>
          ))}
        </div>
        
        <button 
          className="pagination-btn"
          onClick={onNext}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
});