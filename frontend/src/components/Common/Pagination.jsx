import React from 'react';
import PropTypes from 'prop-types';
import classNames from '@utils/classNames';

const Pagination = ({ currentPage, totalPages, onPageChange, siblingCount = 1, boundaryCount = 1 }) => {
    if (totalPages <= 1) {
        return null;
    }

    const DOTS = '...';

    const range = (start, end) => {
        let length = end - start + 1;
        return Array.from({ length }, (_, idx) => idx + start);
    };

    const paginationRange = React.useMemo(() => {
        const totalPageNumbers = boundaryCount * 2 + 1 + siblingCount * 2 + 2;

        if (totalPageNumbers >= totalPages) {
            return range(1, totalPages);
        }

        const leftSiblingIndex = Math.max(currentPage - siblingCount, boundaryCount + 1);
        const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - boundaryCount);

        const shouldShowLeftDots = leftSiblingIndex > boundaryCount + 1;
        const shouldShowRightDots = rightSiblingIndex < totalPages - boundaryCount;

        if (!shouldShowLeftDots && shouldShowRightDots) {
            let leftItemCount = boundaryCount + 1 + 2 * siblingCount;
            let leftRange = range(1, leftItemCount);
            return [...leftRange, DOTS, ...range(totalPages - boundaryCount + 1, totalPages)];
        }

        if (shouldShowLeftDots && !shouldShowRightDots) {
            let rightItemCount = boundaryCount + 1 + 2 * siblingCount;
            let rightRange = range(totalPages - rightItemCount + 1, totalPages);
            return [...range(1, boundaryCount), DOTS, ...rightRange];
        }

        if (shouldShowLeftDots && shouldShowRightDots) {
            let middleRange = range(leftSiblingIndex, rightSiblingIndex);
            return [...range(1, boundaryCount), DOTS, ...middleRange, DOTS, ...range(totalPages - boundaryCount + 1, totalPages)];
        }
        return [];
    }, [totalPages, currentPage, siblingCount, boundaryCount]);


    return (
        <nav aria-label="Page navigation" className="pagination-nav-container">
            <ul className="pagination-list">
                <li className={classNames("pagination-item", { disabled: currentPage === 1 })}>
                    <button
                        type="button"
                        className="pagination-link pagination-link--arrow"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        aria-label="Trang đầu"
                    >
                        <i className="fas fa-angle-double-left"></i>
                    </button>
                </li>
                <li className={classNames("pagination-item", { disabled: currentPage === 1 })}>
                    <button
                        type="button"
                        className="pagination-link pagination-link--arrow"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Trang trước"
                    >
                        <i className="fas fa-angle-left"></i>
                    </button>
                </li>

                {paginationRange.map((pageNumber, index) => {
                    if (pageNumber === DOTS) {
                        return <li key={`${DOTS}-${index}`} className="pagination-item pagination-item--dots"><span>...</span></li>;
                    }
                    return (
                        <li
                            key={pageNumber}
                            className={classNames("pagination-item", { active: pageNumber === currentPage })}
                        >
                            <button
                                type="button"
                                className="pagination-link"
                                onClick={() => onPageChange(pageNumber)}
                            >
                                {pageNumber}
                            </button>
                        </li>
                    );
                })}

                <li className={classNames("pagination-item", { disabled: currentPage === totalPages })}>
                    <button
                        type="button"
                        className="pagination-link pagination-link--arrow"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Trang sau"
                    >
                        <i className="fas fa-angle-right"></i>
                    </button>
                </li>
                <li className={classNames("pagination-item", { disabled: currentPage === totalPages })}>
                    <button
                        type="button"
                        className="pagination-link pagination-link--arrow"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        aria-label="Trang cuối"
                    >
                        <i className="fas fa-angle-double-right"></i>
                    </button>
                </li>
            </ul>
        </nav>
    );
};

Pagination.propTypes = {
    currentPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
    siblingCount: PropTypes.number,
    boundaryCount: PropTypes.number,
};

export default Pagination;