import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange, className = '' }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 3) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
    } else if (page >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = page - 2; i <= page + 2; i++) pages.push(i);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className={`flex items-center justify-center gap-2 mt-12 py-8 ${className}`}>
      <button
        onClick={() => {
          onPageChange(Math.max(1, page - 1));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        disabled={page === 1}
        className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-muted text-white/70 hover:bg-accent hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </button>

      {pages[0] > 1 && (
        <>
          <button
            onClick={() => { onPageChange(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-muted text-white/70 hover:bg-accent hover:text-white transition-all"
          >
            1
          </button>
          {pages[0] > 2 && <span className="text-muted-foreground px-1">...</span>}
        </>
      )}

      {pages.map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => { onPageChange(pageNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            page === pageNum
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-muted text-white/70 hover:bg-accent hover:text-white'
          }`}
        >
          {pageNum}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="text-muted-foreground px-1">...</span>}
          <button
            onClick={() => { onPageChange(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-muted text-white/70 hover:bg-accent hover:text-white transition-all"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => {
          onPageChange(Math.min(totalPages, page + 1));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        disabled={page === totalPages}
        className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-muted text-white/70 hover:bg-accent hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
