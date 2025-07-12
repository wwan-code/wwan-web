import { useState, useEffect } from 'react';
import api from '@services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import SingleFilm from '@components/SingleFilm';
import Pagination from '@components/Common/Pagination';
import { handleApiError } from '@utils/handleApiError';

import '@assets/scss/_trending-anime-page.scss';

const TrendingAnimePage = () => {
    const [trendingAnime, setTrendingAnime] = useState([]);
    const [pagination, setPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 12,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    useEffect(() => {
        const fetchTrendingAnime = async (currentPage = 1) => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get('/prevailing', {
                    params: {
                        category: 'Anime',
                        page: currentPage,
                        limit: pagination.itemsPerPage
                    }
                });
    
                if (response.data?.success) {
                    setTrendingAnime(response.data.movies || []);
                    setPagination(response.data.pagination);
                } else {
                    throw new Error(response.data?.message || 'Không thể tải danh sách Anime thịnh hành');
                }
            } catch (err) {
                setError(err.message);
                handleApiError(err, 'tải phim Anime thịnh hành');
                setTrendingAnime([]);
            } finally {
                setLoading(false);
            }
        };
    
        fetchTrendingAnime(currentPage);
    }, [handleApiError, currentPage, pagination.itemsPerPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
            setSearchParams({ page: newPage.toString() });
            // Scroll to top when page changes
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        document.title = "Anime Thịnh Hành | WWAN Film";
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                when: "beforeChildren",
                staggerChildren: 0.1,
                ease: "easeOut"
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    const headerVariants = {
        hidden: { opacity: 0, y: -20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.6, 
                ease: "easeOut" 
            } 
        }
    };

    if (loading) {
        return (
            <div className="sci-fi-loader">
                <div className="sci-fi-loader__container">
                    <div className="sci-fi-loader__ring"></div>
                    <div className="sci-fi-loader__ring"></div>
                    <div className="sci-fi-loader__ring"></div>
                    <span className="sci-fi-loader__text">Loading</span>
                </div>
            </div>
        );
    }

    return (
        <motion.section 
            className="container trending-anime-page"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <motion.nav 
                aria-label="breadcrumb" 
                className="breadcrumb-container"
                variants={headerVariants}
            >
                <ol className="breadcrumb">
                    <li className="breadcrumb-item">
                        <Link to="/">Trang chủ</Link>
                    </li>
                    <li className="breadcrumb-item">
                        <Link to="/anime">Anime</Link>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                        Thịnh hành
                    </li>
                </ol>
            </motion.nav>

            <motion.div 
                className="trending-anime-page__header"
                variants={headerVariants}
            >
                <h1 className="trending-anime-page__title">
                    <span className="trending-anime-page__title-icon">
                        <i className="fas fa-fire"></i>
                    </span>
                    Anime thịnh hành
                </h1>
                <div className="trending-anime-page__line"></div>
            </motion.div>

            {error && !loading && (
                <motion.div 
                    className="alert alert-danger" 
                    role="alert"
                    variants={itemVariants}
                >
                    {error}
                </motion.div>
            )}
            
            {!loading && !error && (
                <>
                    {trendingAnime.length > 0 ? (
                        <motion.div 
                            className="trending-anime-page__grid"
                            variants={containerVariants}
                        >
                            {trendingAnime.map((movie, index) => (
                                <motion.div 
                                    key={movie.id} 
                                    className="trending-anime-page__item"
                                    variants={itemVariants}
                                >
                                    <SingleFilm movie={movie} />
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                            className="trending-anime-page__empty"
                            variants={itemVariants}
                        >
                            <div className="trending-anime-page__empty-icon">
                                <i className="fas fa-satellite"></i>
                            </div>
                            <div className="trending-anime-page__empty-text">
                                Hiện không có bộ phim Anime thịnh hành nào.
                            </div>
                        </motion.div>
                    )}
                    
                    {pagination.totalPages > 1 && (
                        <motion.div
                            className="trending-anime-page__pagination"
                            variants={itemVariants}
                        >
                            <Pagination
                                currentPage={pagination.currentPage}
                                totalPages={pagination.totalPages}
                                onPageChange={handlePageChange}
                            />
                        </motion.div>
                    )}
                </>
            )}
        </motion.section>
    );
};

export default TrendingAnimePage;