// 自定义Pagination组件

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
  style?: React.CSSProperties;
}

const Pagination = ({ currentPage, pageSize, total, onPageChange, style }: PaginationProps) => {
  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="custom-pagination" style={style}>
      <button
        className="custom-pagination-btn"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        上一页
      </button>

      <div className="custom-pagination-pages">
        {renderPageNumbers().map((page, index) => (
          <button
            key={index}
            className={`custom-pagination-page ${page === currentPage ? 'active' : ''} ${page === '...' ? 'ellipsis' : ''}`}
            onClick={() => typeof page === 'number' && handlePageChange(page)}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        className="custom-pagination-btn"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        下一页
      </button>

      <div className="custom-pagination-info">
        共 {total} 条，第 {currentPage}/{totalPages} 页
      </div>
    </div>
  );
};

export default Pagination;
