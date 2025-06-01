// src/pages/ComicsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import NProgress from 'nprogress';

import SingleComic from '@components/Comics/SingleComic';
import Pagination from '@components/Common/Pagination';
import ComicFilter from '@components/Comics/ComicFilter';
import { handleApiError } from '@utils/handleApiError';

import '@assets/scss/card-section.scss';
import '@assets/scss/components/_single-comic.scss';
import '@assets/scss/pages/_comics-page.scss';

const ITEMS_PER_PAGE_COMICS = 20;

const ComicsPage = () => {
    const [comics, setComics] = useState([]);
    const [pagination, setPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: ITEMS_PER_PAGE_COMICS,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    const activeFilters = useMemo(() => {
        const params = {};
        for (const [key, value] of searchParams.entries()) {
            if (key !== 'page' && value) {
                params[key] = value;
            }
        }
        if (!params.sort) {
            params.sort = 'lastChapterUpdatedAt_desc';
        }
        return params;
    }, [searchParams]);

    useEffect(() => {
        const fetchComicsData = async (page, currentAPIFilters) => {
            setLoading(true); setError(null); NProgress.start();
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

                const response = await axios.get('/api/comics', { params: apiParams });

                if (response.data?.success) {
                    setComics(response.data.comics || []);
                    setPagination(response.data.pagination || { totalItems: 0, totalPages: 1, currentPage: page, itemsPerPage: ITEMS_PER_PAGE_COMICS });
                } else {
                    throw new Error(response.data?.message || 'Failed to fetch comics data');
                }
            } catch (err) {
                handleApiError(err, 'tải danh sách truyện');
                setComics([]);
                setPagination(prev => ({ ...prev, totalItems: 0, totalPages: 1, currentPage: 1 }));
            } finally {
                setLoading(false); NProgress.done();
            }
        };

        fetchComicsData(currentPage, activeFilters);

    }, [currentPage, activeFilters, handleApiError]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== currentPage) {
            setSearchParams(prev => {
                const newSearch = new URLSearchParams(prev);
                newSearch.set('page', newPage.toString());
                return newSearch;
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const qParam = searchParams.get('q');
        let title = "Truyện Tranh";
        if (qParam) title += ` - Tìm: "${qParam}"`;
        document.title = `${title} - Trang ${pagination.currentPage} | WWAN Film`;
    }, [pagination.currentPage, searchParams]);

    return (
        <section className="container comic-list-page page-section">
            <div className="row-custom">
                <div className="sidebar-col col-custom-3 order-md-first">
                    <div className="filter-sidebar sticky-filter">
                        <ComicFilter />
                    </div>
                </div>
                <div className="main-content-col col-custom-9 order-md-last">
                    <div className="section-header">
                        <h2 className="section-title">
                            <i className="fas fa-book-reader icon-before"></i>Truyện Tranh
                            {activeFilters.q && <span className="search-query-display">: "{activeFilters.q}"</span>}
                        </h2>
                        {!loading && pagination.totalItems > 0 && (
                            <span className="search-results-count">
                                ({pagination.totalItems} kết quả)
                            </span>
                        )}
                    </div>

                    {loading && comics.length === 0 && (
                        <div className="loading-indicator full-page-loader">
                            <div className="spinner-eff"></div>
                        </div>
                    )}
                    {error && !loading && (
                        <div className="error-message">
                            <i className="fas fa-exclamation-triangle"></i> {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {comics.length > 0 ? (
                                <div className="card-grid comic-grid">
                                    {comics.map((comic) => (
                                        <SingleComic key={comic.id} comic={comic} />
                                    ))}
                                </div>
                            ) : (
                                <div className="no-results-found">
                                    <i className="fas fa-info-circle"></i> Khoông tìm thấy kết quả.
                                </div>
                            )}
                            {pagination.totalPages > 1 && (
                                <Pagination
                                    currentPage={pagination.currentPage}
                                    totalPages={pagination.totalPages}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ComicsPage;