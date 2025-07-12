// src/pages/ComicsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '@services/api';
import { useSearchParams } from 'react-router-dom';
import useDebounce from '@hooks/useDebounce';
import NProgress from 'nprogress';
import { handleApiError } from '@utils/handleApiError';

import SingleComic from '@components/Comics/SingleComic';
import ComicFilterModal from '@components/Comics/ComicFilterModal';
import HeaderBanner from '@components/HeaderBanner';

import '@assets/scss/pages/_comics-page.scss';
import '@assets/scss/components/_single-comic.scss';

const ITEMS_PER_PAGE_COMICS = 24;

const ComicsPage = () => {
    const [comics, setComics] = useState([]);
    const [pagination, setPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: ITEMS_PER_PAGE_COMICS,
    });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Debounce the search term to avoid flooding API requests while typing
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    const activeFilters = useMemo(() => {
        const params = {};
        for (const [key, value] of searchParams.entries()) {
            if (key !== 'page' && key !== 'q' && value) {
                params[key] = value;
            }
        }
        if (!params.sort) {
            params.sort = 'lastChapterUpdatedAt_desc';
        }
        if (debouncedSearchTerm.trim() !== '') {
            params.q = debouncedSearchTerm.trim();
        }
        return params;
    }, [searchParams, debouncedSearchTerm]);

    const activeFilterCount = useMemo(() => {
        return Object.keys(activeFilters).filter(key => 
            key !== 'sort' && activeFilters[key] && activeFilters[key] !== 'all'
        ).length;
    }, [activeFilters]);

    const fetchComicsData = async (page, currentAPIFilters, append = false) => {
        if (append) setLoadingMore(true); else setLoading(true);
        setError(null); NProgress.start();
        try {
            const apiParams = {
                page: page,
                limit: ITEMS_PER_PAGE_COMICS,
                sortBy: currentAPIFilters.sort ? currentAPIFilters.sort.split('_')[0] : 'lastChapterUpdatedAt',
                sortOrder: currentAPIFilters.sort ? currentAPIFilters.sort.split('_')[1]?.toUpperCase() : 'DESC',
                status: currentAPIFilters.status === 'all' ? undefined : currentAPIFilters.status,
                genre: currentAPIFilters.genre,
                country: currentAPIFilters.country,
                category: currentAPIFilters.category,
                year: currentAPIFilters.year,
                q: currentAPIFilters.q,
            };
            Object.keys(apiParams).forEach(key => (apiParams[key] === undefined || apiParams[key] === '' || apiParams[key] === null || apiParams[key] === 'all') && delete apiParams[key]);

            const response = await api.get('/comics', { params: apiParams });

            if (response.data?.success) {
                setComics(prev => append ? [...prev, ...(response.data.comics || [])] : (response.data.comics || []));
                setPagination(response.data.pagination || { totalItems: 0, totalPages: 1, currentPage: page, itemsPerPage: ITEMS_PER_PAGE_COMICS });
            } else {
                throw new Error(response.data?.message || 'Failed to fetch comics data');
            }
        } catch (err) {
            handleApiError(err, 'tải danh sách truyện');
            setComics([]);
            setPagination(prev => ({ ...prev, totalItems: 0, totalPages: 1, currentPage: 1 }));
        } finally {
            if (append) setLoadingMore(false); else setLoading(false);
            NProgress.done();
        }
    };

    // Fetch comics data whenever filters or debounced search term change
    useEffect(() => {
        setComics([]);
        setPagination({
            totalItems: 0,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: ITEMS_PER_PAGE_COMICS,
        });
        fetchComicsData(1, activeFilters, false);
    }, [activeFilters]);

    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
                !loadingMore &&
                !loading &&
                pagination.currentPage < pagination.totalPages
            ) {
                fetchComicsData(pagination.currentPage + 1, activeFilters, true);
                setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadingMore, loading, pagination, activeFilters]);

    useEffect(() => {
        const qParam = debouncedSearchTerm;
        let title = "Truyện Tranh";
        if (qParam) title += ` - Tìm: "${qParam}"`;
        document.title = `${title} - Trang ${pagination.currentPage} | WWAN Film`;
    }, [pagination.currentPage, debouncedSearchTerm]);

    const getSortDisplayName = (sortValue) => {
        const sortOptions = {
            'lastChapterUpdatedAt_desc': 'Mới cập nhật',
            'views_desc': 'Xem nhiều nhất',
            'createdAt_desc': 'Truyện mới',
            'year_desc': 'Năm (Mới)',
            'year_asc': 'Năm (Cũ)',
            'title_asc': 'Tên A-Z',
            'title_desc': 'Tên Z-A',
        };
        return sortOptions[sortValue] || 'Mới cập nhật';
    };

    return (
        <div className="manga-page">
            <HeaderBanner searchValue={searchTerm} onSearchChange={setSearchTerm} />
            
            <div className="manga-page__container">
                <div className="manga-page__header">
                    <div className="manga-page__title-section">
                        <h1 className="manga-page__title">
                            <i className="fas fa-book-open"></i>
                            <span>Truyện Tranh</span>
                            {activeFilters.q && (
                                <span className="manga-page__search-query">
                                    : "{activeFilters.q}"
                                </span>
                            )}
                        </h1>
                        {!loading && pagination.totalItems > 0 && (
                            <p className="manga-page__subtitle">
                                Tìm thấy <strong>{pagination.totalItems.toLocaleString()}</strong> truyện
                            </p>
                        )}
                    </div>

                    <div className="manga-page__controls">
                        <div className="manga-page__sort-info">
                            <span className="manga-page__sort-label">Sắp xếp:</span>
                            <span className="manga-page__sort-value">
                                {getSortDisplayName(activeFilters.sort)}
                            </span>
                        </div>
                        
                        <button 
                            className={`manga-filter-toggle ${activeFilterCount > 0 ? 'manga-filter-toggle--active' : ''}`}
                            onClick={() => setShowFilterModal(true)}
                        >
                            <i className="fas fa-filter"></i>
                            <span>Bộ lọc</span>
                            {activeFilterCount > 0 && (
                                <span className="manga-filter-toggle__badge">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="manga-page__content">
                    {loading && comics.length === 0 && (
                        <div className="manga-loading">
                            <div className="manga-loading__spinner"></div>
                            <p>Đang tải truyện...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="manga-error">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {comics.length > 0 ? (
                                <div className="manga-grid">
                                    {comics.map((comic) => (
                                        <SingleComic key={comic.id} comic={comic} />
                                    ))}
                                </div>
                            ) : (
                                <div className="manga-empty">
                                    <div className="manga-empty__icon">
                                        <i className="fas fa-search"></i>
                                    </div>
                                    <h3>Không tìm thấy truyện nào</h3>
                                    <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                </div>
                            )}

                            {loadingMore && (
                                <div className="manga-loading-more">
                                    <div className="manga-loading__spinner"></div>
                                    <p>Đang tải thêm...</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {showFilterModal && (
                <ComicFilterModal 
                    onClose={() => setShowFilterModal(false)}
                    activeFilters={activeFilters}
                />
            )}
        </div>
    );
};

export default ComicsPage;