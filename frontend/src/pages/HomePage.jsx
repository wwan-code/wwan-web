import React, { useReducer, useEffect, useRef, memo, useCallback, lazy, Suspense } from 'react';
import MovieArea from "@components/MovieArea";
import { useSearchParams } from 'react-router-dom';
import NProgress from "nprogress";
import { handleApiError } from "@utils/handleApiError";
import api from "@services/api";
import { Link } from 'react-router-dom';
import Pagination from '@components/Common/Pagination';
import SingleFilm from '@components/SingleFilm';
import SingleComic from "@components/Comics/SingleComic";
import TypewriterText from "@components/Effects/TypewriterText";

const RecommendedMovies = lazy(() => import("@components/RecommendedMovies"));
const RecommendedComics = lazy(() => import("@components/RecommendedComics"));
const TopAnimeRankings = lazy(() => import("@components/TopAnimeRankings"));

const ITEMS_PER_MAIN_LIST = 20;
const ITEMS_FOR_SIDEBAR_FEATURED = 12;
const ITEMS_FOR_COMICS_SECTION = 12;
const ITEMS_FOR_ANIME_SECTION = 12;

const initialState = {
    pageData: {
        featuredForHero: [],
        featuredForSidebar: [],
        latestComics: [],
        mainMovieList: [],
    },
    mainMoviePagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: ITEMS_PER_MAIN_LIST,
    },
    loading: {
        initial: true,
        mainMovies: true,
    },
    error: null,
};

function homePageReducer(state, action) {
    switch (action.type) {
        case 'FETCH_HOME_INIT':
            return {
                ...state,
                loading: { ...state.loading, initial: true },
                error: null,
            };
        case 'FETCH_HOME_SUCCESS':
            return {
                ...state,
                pageData: {
                    ...state.pageData,
                    ...action.payload,
                },
                loading: { ...state.loading, initial: false },
            };
        case 'FETCH_HOME_FAILURE':
            return {
                ...state,
                loading: { ...state.loading, initial: false },
                error: action.payload,
            };
        case 'FETCH_MAIN_MOVIES_START':
            return {
                ...state,
                loading: { ...state.loading, mainMovies: true },
            };
        case 'FETCH_MAIN_MOVIES_SUCCESS':
            return {
                ...state,
                pageData: { ...state.pageData, mainMovieList: action.payload.movies },
                mainMoviePagination: action.payload.pagination,
                loading: { ...state.loading, mainMovies: false },
            };
        case 'FETCH_MAIN_MOVIES_FAILURE':
            return {
                ...state,
                pageData: { ...state.pageData, mainMovieList: [] },
                loading: { ...state.loading, mainMovies: false },
                error: action.payload,
            };
        default:
            return state;
    }
}

const SidebarSkeletonLoader = ({ itemCount = 5, title }) => (
    <section className="film-sidebar__section">
        {title && <div className="film-sidebar__title placeholder-title"></div>}
        <ul className="film-sidebar__list">
            {Array.from({ length: itemCount }).map((_, index) => (
                <li key={`skel-sidebar-${index}`} className="film-sidebar__item is-loading">
                    <div className="skeleton-sidebar-item">
                        <div className="skeleton-sidebar-title placeholder col-8"></div>
                        <div className="skeleton-sidebar-meta placeholder col-4 mt-1"></div>
                    </div>
                </li>
            ))}
        </ul>
    </section>
);
const MemoizedSidebarSkeletonLoader = memo(SidebarSkeletonLoader);

const MainListSkeletonLoader = ({ itemCount = 12 }) => (
    <>
        {Array.from({ length: itemCount }).map((_, index) => (
            <div key={`skel-main-${index}`} className="film-area__list-item">
                <div className="skeleton-card comic-card">
                    <div className="skeleton-image"></div>
                    <div className="skeleton-title"></div>
                    <div className="skeleton-meta"></div>
                </div>
            </div>
        ))}
    </>
);
const MemoizedMainListSkeletonLoader = memo(MainListSkeletonLoader);
const SectionSkeletonLoader = ({ itemCount = 4, itemType = "film", title }) => (
    <div className="card-section mt-5 skeleton-section">
        <div className="container">
            {title && (
                <div className="section-title d-flex justify-content-between align-items-center">
                    <h3>{title}</h3>
                    <span className="btn-view-more placeholder col-2"></span>
                </div>
            )}
            <div className="row g-3">
                {Array.from({ length: itemCount }).map((_, index) => (
                    <div key={`skeleton-${title?.replace(/\s+/g, '-').toLowerCase() || 'item'}-${index}`} className={`col-6 ${itemType === "comic" ? "col-sm-4 col-md-3 col-lg-2" : "col-sm-6 col-md-4 col-lg-3 col-xl-2"}`}>
                        <div className="skeleton-card">
                            <div className="skeleton-image"></div>
                            <div className="skeleton-title"></div>
                            <div className="skeleton-meta"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
const MemoizedSectionSkeletonLoader = memo(SectionSkeletonLoader);

const HomePage = () => {
    const [state, dispatch] = useReducer(homePageReducer, initialState);
    const { pageData, mainMoviePagination, loading, error } = state;
    const {
        featuredForHero,
        featuredForSidebar,
        latestComics,
        mainMovieList,
    } = pageData;

    const [searchParams, setSearchParams] = useSearchParams();
    const mainListRef = useRef(null);
    const currentPageForMainList = parseInt(searchParams.get('page') || '1', 10);
    const currentSortForMainList = searchParams.get('sort') || 'latest';

    useEffect(() => {
        const fetchHomePageData = async () => {
            NProgress.start();
            dispatch({ type: 'FETCH_HOME_INIT' });

            try {
                const response = await api.get('/page/home-layout', {
                    params: {
                        limitHero: 5,
                        limitSidebar: ITEMS_FOR_SIDEBAR_FEATURED,
                        limitComics: ITEMS_FOR_COMICS_SECTION,
                        limitAnime: ITEMS_FOR_ANIME_SECTION,
                    }
                });

                if (response.data?.success) {
                    const {
                        featuredForHero = [],
                        featuredForSidebar = [],
                        latestComics = [],
                    } = response.data.data;
                    dispatch({
                        type: 'FETCH_HOME_SUCCESS',
                        payload: {
                            featuredForHero,
                            featuredForSidebar,
                            latestComics,
                        }
                    });
                } else {
                    throw new Error(response.data?.message || 'Không thể tải dữ liệu trang chủ.');
                }
            } catch (err) {
                const errorMessage = handleApiError(err, "dữ liệu trang chủ");
                dispatch({ type: 'FETCH_HOME_FAILURE', payload: errorMessage });
            } finally {
                NProgress.done();
            }
        };
        fetchHomePageData();
    }, []);

    useEffect(() => {
        const fetchMainMoviesList = async (page, sort) => {
            dispatch({ type: 'FETCH_MAIN_MOVIES_START' });
            NProgress.start();
            try {
                const response = await api.get('/movies/list', {
                    params: {
                        page: page,
                        limit: ITEMS_PER_MAIN_LIST,
                        sortBy: sort === 'popular' ? 'views' : 'createdAt',
                        sortOrder: 'DESC',
                    }
                });
                if (response.data?.success) {
                    dispatch({
                        type: 'FETCH_MAIN_MOVIES_SUCCESS',
                        payload: {
                            movies: response.data.movies || [],
                            pagination: response.data.pagination || { ...initialState.mainMoviePagination, currentPage: page }
                        }
                    });
                } else { b
                    throw new Error(response.data?.message || 'Lỗi tải danh sách phim.');
                }
            } catch (err) {
                const errorMessage = handleApiError(err, `danh sách phim (${sort})`);
                dispatch({ type: 'FETCH_MAIN_MOVIES_FAILURE', payload: errorMessage });
            } finally {
                NProgress.done();
            }
        };

        fetchMainMoviesList(currentPageForMainList, currentSortForMainList);
        if (currentPageForMainList !== 1) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentPageForMainList, currentSortForMainList]);

    const handleMainListFilterChange = useCallback((e, newSort) => {
        if (newSort !== currentSortForMainList) {
            setSearchParams({ sort: newSort, page: '1' });
        }
    }, [currentSortForMainList, setSearchParams]);

    const handleMainListPageChange = useCallback((newPage) => {
        if (newPage !== currentPageForMainList && newPage >= 1 && newPage <= mainMoviePagination.totalPages) {
            setSearchParams({ sort: currentSortForMainList, page: newPage.toString() });
        }
    }, [currentSortForMainList, currentPageForMainList, mainMoviePagination.totalPages, setSearchParams]);

    useEffect(() => {
        document.title = "Trang chủ - WWAN";
    }, []);

    const heroTaglines = [
        "Khám phá hàng ngàn bộ phim.",
        "Đọc truyện tranh yêu thích.",
        "Tham gia cộng đồng WWAN.",
        "Trải nghiệm giải trí đỉnh cao!"
    ];

    if (error && !loading.initial) {
        return (
            <div className="container text-center py-5 mt-5">
                <h4>Lỗi tải trang chủ</h4>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <>
            <MovieArea data={{ featuredMovies: featuredForHero }} loading={loading.initial} />
            <section className="hero-section" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <h1>
                    <TypewriterText
                        text="Chào mừng đến với WWAN"
                        speed={100}
                        loop={false}
                        cursorChar=""
                    />
                </h1>
                <h2 style={{ marginTop: '20px' }}>
                    <TypewriterText
                        text={heroTaglines}
                        speed={75}
                        loop={true}
                        delayAfterLoop={2000}
                        cursorChar="_"
                    />
                </h2>
            </section>
            <Suspense fallback={<div style={{ height: '400px' }} />}>
                <RecommendedMovies />
            </Suspense>
            <Suspense fallback={<div style={{ height: '400px' }} />}>
                <RecommendedComics />
            </Suspense>
            <Suspense fallback={<div style={{ height: '400px' }} />}>
                
            </Suspense>
            <div className="film-area">
                <div className="film-area__container">
                    <div className="film-area__grid">
                        <main className="film-area__main">
                            <header className="film-area__header">
                                <h3 className="film-area__title">
                                    <i className="fa-regular fa-rectangle-list me-2"></i>
                                    {currentSortForMainList === 'popular' ? "Phim Phổ Biến" : "Mới Cập Nhật"}
                                </h3>
                                <ul className="film-area__filters">
                                    <li
                                        className={`film-area__filter-item ${currentSortForMainList === 'latest' ? 'film-area__filter-item--active' : ''}`}
                                        onClick={(e) => handleMainListFilterChange(e, 'latest')}
                                        role="button"
                                        aria-disabled={loading.mainMovies}
                                    >
                                        Mới nhất
                                    </li>
                                    <li
                                        className={`film-area__filter-item ${currentSortForMainList === 'popular' ? 'film-area__filter-item--active' : ''}`}
                                        onClick={(e) => handleMainListFilterChange(e, 'popular')}
                                        role="button"
                                        aria-disabled={loading.mainMovies}
                                    >
                                        Phổ biến
                                    </li>
                                </ul>
                            </header>

                            <div className="film-area__content" id={`film-${currentSortForMainList}`} ref={mainListRef}>
                                {loading.mainMovies && mainMovieList.length === 0 ? (
                                    <div className="film-area__list">
                                        <MemoizedMainListSkeletonLoader itemCount={ITEMS_PER_MAIN_LIST} />
                                    </div>
                                ) : !loading.mainMovies && mainMovieList.length === 0 ? (
                                    <div className="text-center">Không có phim nào để hiển thị.</div>
                                ) : (
                                    <>
                                        <div className="film-area__list">
                                            {mainMovieList.map((movie) => (
                                                <div key={`main-list-${movie.id}`} className="film-area__list-item">
                                                    <SingleFilm movie={movie} />
                                                </div>
                                            ))}
                                        </div>
                                        {mainMoviePagination.totalPages > 1 && (
                                            <Pagination
                                                currentPage={mainMoviePagination.currentPage}
                                                totalPages={mainMoviePagination.totalPages}
                                                onPageChange={handleMainListPageChange}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </main>

                        <aside className="film-area__sidebar">
                            {loading.initial ? (
                                <MemoizedSidebarSkeletonLoader itemCount={ITEMS_FOR_SIDEBAR_FEATURED / 2} title="Phim nổi bật tuần" />
                            ) : featuredForSidebar.length > 0 ? (
                                <section className="sidebar-section">
                                    <h4 className="sidebar-section__title">
                                        Phim nổi bật tuần
                                    </h4>
                                    <ul className="sidebar-section__list">
                                        {featuredForSidebar.map((movie) => {
                                            const lastEpisodeNumber = movie.Episodes?.[0]?.episodeNumber || (movie.belongToCategory === 1 ? '?' : '');
                                            return (
                                                <li className="sidebar-section__item" key={`sidebar-${movie.id}`}>
                                                    <Link to={`/album/${movie.slug}`} className="sidebar-section__link" title={movie.title}>
                                                        <span className="sidebar-section__name">{movie.title}</span>
                                                        {movie.belongToCategory === 1 && (
                                                            <span className="sidebar-section__episode">Tập {lastEpisodeNumber}</span>
                                                        )}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            ) : (
                                <p className="text-muted small p-2">Không có phim nổi bật.</p>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
            <Suspense fallback={<div style={{ height: '500px' }} />}>
                <TopAnimeRankings />
            </Suspense>
        </>
    );
};

export default HomePage;