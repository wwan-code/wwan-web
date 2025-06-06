// src/pages/Home.jsx
import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import NProgress from 'nprogress';
import { Alert} from 'react-bootstrap';
import { useRef } from "react";
import { handleApiError } from "@utils/handleApiError";
import MovieArea from "@components/MovieArea";
import SingleFilm from "@components/SingleFilm";
import SingleComic from "@components/Comics/SingleComic";
import Pagination from "@components/Common/Pagination";
import RecommendedMovies from "@components/RecommendedMovies";
import "@assets/scss/pages/_home-page.scss";

const ITEMS_PER_MAIN_LIST = 20;
const ITEMS_FOR_SIDEBAR_FEATURED = 10;
const ITEMS_FOR_COMICS_SECTION = 6;
const ITEMS_FOR_ANIME_SECTION = 8;
const ITEMS_PER_SECTION_DEFAULT = {
    topSingleMovies: 5,
    topSingleComics: 5,
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

const MainListSkeletonLoader = ({ itemCount = 8 }) => (
    <div className="row g-3">
        {Array.from({ length: itemCount }).map((_, index) => (
            <div key={`skel-main-${index}`} className="col-6 col-md-4 col-lg-4 col-xl-3">
                <div className="skeleton-card">
                    <div className="skeleton-image"></div>
                    <div className="skeleton-title"></div>
                    <div className="skeleton-meta"></div>
                </div>
            </div>
        ))}
    </div>
);

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

const ContentSection = ({
    title,
    items,
    itemType = "film",
    icon,
    isLoading,
    viewMoreLink,
    sectionId,
    loadingItemCount,
    layout = "grid"
}) => {
    const displayItemCount = loadingItemCount || (itemType === "comic" ? 5 : 4);

    if (isLoading && (!items || items.length === 0)) {
        return <SectionSkeletonLoader itemCount={displayItemCount} itemType={itemType} title={title} />;
    }

    if (!isLoading && (!items || items.length === 0)) {
        return null;
    }

    const getItemColClass = () => {
        if (layout === 'scrollable-row') {
            return itemType === "comic" ? 'comic-card-scroll-item' : 'film-card-scroll-item';
        }
        return `col-6 ${itemType === "comic" ? "col-sm-4 col-md-3 col-lg-2" : "col-sm-6 col-md-4 col-lg-3 col-xl-2"}`;
    };

    return (
        <div className={`card-section mt-5 section-layout-${layout}`} id={sectionId}>
            <div className="container">
                <div className="section-title d-flex justify-content-between align-items-center">
                    <h3>{icon}{title}</h3>
                    {viewMoreLink && <Link to={viewMoreLink} className="btn-view-more">Xem tất cả <i className="fas fa-chevron-right ms-1"></i></Link>}
                </div>
                {layout === 'scrollable-row' ? (
                    <div className="scrollable-row-container">
                        <div className="scrollable-row-content">
                            {items.map((item) => (
                                <div key={`${itemType}-${item.id}`} className={getItemColClass()}>
                                    {itemType === "film" ? <SingleFilm movie={item} /> : <SingleComic comic={item} />}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="row g-3">
                        {items.map((item) => (
                            <div key={`${itemType}-${item.id}`} className={getItemColClass()}>
                                {itemType === "film" ? <SingleFilm movie={item} /> : <SingleComic comic={item} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const HomePage = () => {
    const [featuredForHero, setFeaturedForHero] = useState([]);
    const [featuredForSidebar, setFeaturedForSidebar] = useState([]);
    const [latestComics, setLatestComics] = useState([]);
    const [trendingAnime, setTrendingAnime] = useState([]);
    const [topSeriesMovies, setTopSeriesMovies] = useState([]);
    const [topSingleMovies, setTopSingleMovies] = useState([]);

    const [mainMovieList, setMainMovieList] = useState([]);
    const [mainMoviePagination, setMainMoviePagination] = useState({
        totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: ITEMS_PER_MAIN_LIST,
    });

    const [loadingStates, setLoadingStates] = useState({
        hero: true,
        sidebarFeatured: true,
        latestComics: true,
        trendingAnime: true,
        mainMovies: true,
    });
    const [overallError, setOverallError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const mainListRef = useRef(null);

    const currentPageForMainList = parseInt(searchParams.get('page') || '1', 10);
    const currentSortForMainList = searchParams.get('sort') || 'latest';

    useEffect(() => {
        const fetchHomePageData = async () => {
            NProgress.start();
            setLoadingStates(prev => ({
                ...prev,
                hero: true,
                sidebarFeatured: true,
                latestComics: true,
                trendingAnime: true,
            }));
            setOverallError(null);

            try {
                const response = await axios.get('/api/page/home-layout', {
                    params: {
                        limitHero: 5,
                        limitSidebar: ITEMS_FOR_SIDEBAR_FEATURED,
                        limitComics: ITEMS_FOR_COMICS_SECTION,
                        limitAnime: ITEMS_FOR_ANIME_SECTION,
                    }
                });

                if (response.data?.success) {
                    const data = response.data.data;
                    setFeaturedForHero(data.featuredForHero || []);
                    setFeaturedForSidebar(data.featuredForSidebar || []);
                    setLatestComics(data.latestComics || []);
                    setTrendingAnime(data.trendingAnime || []);
                    setTopSeriesMovies(data.topSeriesMovies || []);
                    setTopSingleMovies(data.topSingleMovies || []);
                } else {
                    throw new Error(response.data?.message || 'Không thể tải dữ liệu trang chủ.');
                }
            } catch (err) {
                handleApiError(err, "dữ liệu trang chủ");
            } finally {
                setLoadingStates(prev => ({
                    ...prev,
                    hero: false, sidebarFeatured: false, latestComics: false, trendingAnime: false,
                }));
                NProgress.done();
            }
        };
        fetchHomePageData();
    }, [handleApiError]);

    useEffect(() => {
        const fetchMainMoviesList = async (page, sort) => {
            setLoadingStates(prev => ({ ...prev, mainMovies: true }));
            NProgress.start();
            try {
                const response = await axios.get('/api/movies/list', {
                    params: {
                        page: page,
                        limit: ITEMS_PER_MAIN_LIST,
                        sortBy: sort === 'popular' ? 'views' : 'createdAt',
                        sortOrder: 'DESC',
                    }
                });
                if (response.data?.success) {
                    setMainMovieList(response.data.movies || []);
                    setMainMoviePagination(response.data.pagination || {
                        totalItems: 0, totalPages: 1, currentPage: page, itemsPerPage: ITEMS_PER_MAIN_LIST
                    });
                } else {
                    throw new Error(response.data?.message || 'Lỗi tải danh sách phim.');
                }
            } catch (err) {
                handleApiError(err, `danh sách phim (${sort})`);
                setMainMovieList([]);
            } finally {
                setLoadingStates(prev => ({ ...prev, mainMovies: false }));
                NProgress.done();
            }
        };

        fetchMainMoviesList(currentPageForMainList, currentSortForMainList);
        if (currentPageForMainList !== 1) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentPageForMainList, currentSortForMainList, handleApiError]);

    const handleMainListFilterChange = (e, newSort) => {
        if (newSort !== currentSortForMainList) {
            setSearchParams({ sort: newSort, page: '1' });
        }
    };

    const handleMainListPageChange = (newPage) => {
        if (newPage !== currentPageForMainList && newPage >= 1 && newPage <= mainMoviePagination.totalPages) {
            setSearchParams({ sort: currentSortForMainList, page: newPage.toString() });
        }
    };
    
    useEffect(() => {
        document.title = "Trang chủ - WWAN";
    }, []);

    if (overallError && !loadingStates.hero && !loadingStates.sidebarFeatured) {
        return (
            <div className="container text-center py-5 mt-5">
                <Alert variant="danger"><h4>Lỗi tải trang chủ</h4><p>{overallError}</p></Alert>
            </div>
        );
    }

    return (
        <>
            <MovieArea data={{ featuredMovies: featuredForHero }} />
            <RecommendedMovies />
            <div className="GlowingBackdrop_glowingBackdrop__igxwa">
                <svg viewBox="0 0 1216 726" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><mask id="mask0_91_8" maskUnits="userSpaceOnUse" width="1216" height="726" x="0" y="0"><rect width="1216" height="725.8" fill="url(#paint0_radial_91_8)"></rect></mask><g mask="url(#mask0_91_8)"><path d="M717.133 231.367L759.799 206.733L802.465 231.367V280.633L759.799 305.267L717.133 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M760.432 306.367L803.099 281.733L845.765 306.367V355.633L803.099 380.267L760.432 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M803.732 231.367L846.398 206.733L889.065 231.367V280.633L846.398 305.267L803.732 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M847.032 306.367L889.698 281.733L932.365 306.367V355.633L889.698 380.267L847.032 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M890.332 381.367L932.998 356.733L975.664 381.367V430.633L932.998 455.267L890.332 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M933.632 306.367L976.298 281.733L1018.96 306.367V355.633L976.298 380.267L933.632 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M587.233 306.367L629.899 281.733L672.566 306.367V355.633L629.899 380.267L587.233 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M630.533 381.367L673.199 356.733L715.865 381.367V430.633L673.199 455.267L630.533 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M673.833 306.367L716.499 281.733L759.165 306.367V355.633L716.499 380.267L673.833 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M717.133 381.367L759.799 356.733L802.465 381.367V430.633L759.799 455.267L717.133 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M760.432 456.367L803.099 431.733L845.765 456.367V505.633L803.099 530.267L760.432 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M803.732 381.367L846.398 356.733L889.065 381.367V430.633L846.398 455.267L803.732 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M976.931 381.367L1019.6 356.733L1062.26 381.367V430.633L1019.6 455.267L976.931 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1020.23 456.367L1062.9 431.733L1105.56 456.367V505.633L1062.9 530.267L1020.23 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1063.53 381.367L1106.2 356.733L1148.86 381.367V430.633L1106.2 455.267L1063.53 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1106.83 456.367L1149.5 431.733L1192.16 456.367V505.633L1149.5 530.267L1106.83 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1150.13 531.367L1192.8 506.733L1235.46 531.367V580.633L1192.8 605.267L1150.13 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1193.43 456.367L1236.1 431.733L1278.76 456.367V505.633L1236.1 530.267L1193.43 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M847.032 456.367L889.698 431.733L932.365 456.367V505.633L889.698 530.267L847.032 505.633V456.367Z" fill="white" fillOpacity="0.25" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M890.332 531.367L932.998 506.733L975.664 531.367V580.633L932.998 605.267L890.332 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M933.632 456.367L976.298 431.733L1018.96 456.367V505.633L976.298 530.267L933.632 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M976.931 531.367L1019.6 506.733L1062.26 531.367V580.633L1019.6 605.267L976.931 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1020.23 606.367L1062.9 581.733L1105.56 606.367V655.633L1062.9 680.267L1020.23 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1063.53 531.367L1106.2 506.733L1148.86 531.367V580.633L1106.2 605.267L1063.53 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M976.931 81.3666L1019.6 56.7332L1062.26 81.3666V130.633L1019.6 155.267L976.931 130.633V81.3666Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1020.23 156.367L1062.9 131.733L1105.56 156.367V205.633L1062.9 230.267L1020.23 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1063.53 81.3666L1106.2 56.7332L1148.86 81.3666V130.633L1106.2 155.267L1063.53 130.633V81.3666Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1106.83 156.367L1149.5 131.733L1192.16 156.367V205.633L1149.5 230.267L1106.83 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1150.13 231.367L1192.8 206.733L1235.46 231.367V280.633L1192.8 305.267L1150.13 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1193.43 156.367L1236.1 131.733L1278.76 156.367V205.633L1236.1 230.267L1193.43 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M847.032 156.367L889.698 131.733L932.365 156.367V205.633L889.698 230.267L847.032 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M890.332 231.367L932.998 206.733L975.664 231.367V280.633L932.998 305.267L890.332 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M933.632 156.367L976.298 131.733L1018.96 156.367V205.633L976.298 230.267L933.632 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M976.931 231.367L1019.6 206.733L1062.26 231.367V280.633L1019.6 305.267L976.931 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1020.23 306.367L1062.9 281.733L1105.56 306.367V355.633L1062.9 380.267L1020.23 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1063.53 231.367L1106.2 206.733L1148.86 231.367V280.633L1106.2 305.267L1063.53 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1106.83 306.367L1149.5 281.733L1192.16 306.367V355.633L1149.5 380.267L1106.83 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1150.13 381.367L1192.8 356.733L1235.46 381.367V430.633L1192.8 455.267L1150.13 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1193.43 306.367L1236.1 281.733L1278.76 306.367V355.633L1236.1 380.267L1193.43 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M240.523 6.36671L283.211 -18.2669L325.899 6.36671V55.6333L283.211 80.2669L240.523 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M327.167 6.36671L369.855 -18.2669L412.543 6.36671V55.6333L369.855 80.2669L327.167 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M370.486 81.3667L413.174 56.7331L455.862 81.3667V130.633L413.174 155.267L370.486 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M413.81 6.36671L456.498 -18.2669L499.186 6.36671V55.6333L456.498 80.2669L413.81 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M67.2365 6.36671L109.925 -18.2669L152.613 6.36671V55.6333L109.925 80.2669L67.2365 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M110.558 81.3667L153.246 56.7331L195.934 81.3667V130.633L153.246 155.267L110.558 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M153.88 6.36671L196.568 -18.2669L239.256 6.36671V55.6333L196.568 80.2669L153.88 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M197.201 81.3667L239.889 56.7331L282.577 81.3667V130.633L239.889 155.267L197.201 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M240.523 156.367L283.211 131.733L325.899 156.367V205.633L283.211 230.267L240.523 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M283.845 81.3667L326.533 56.7331L369.221 81.3667V130.633L326.533 155.267L283.845 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M457.13 81.3667L499.818 56.7331L542.506 81.3667V130.633L499.818 155.267L457.13 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M500.452 156.367L543.14 131.733L585.828 156.367V205.633L543.14 230.267L500.452 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M543.775 81.3667L586.463 56.7331L629.151 81.3667V130.633L586.463 155.267L543.775 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M587.095 156.367L629.783 131.733L672.471 156.367V205.633L629.783 230.267L587.095 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M630.416 231.367L673.104 206.733L715.792 231.367V280.633L673.104 305.267L630.416 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M673.738 156.367L716.426 131.733L759.114 156.367V205.633L716.426 230.267L673.738 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M327.167 156.367L369.855 131.733L412.543 156.367V205.633L369.855 230.267L327.167 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M370.486 231.367L413.174 206.733L455.862 231.367V280.633L413.174 305.267L370.486 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M413.81 156.367L456.498 131.733L499.186 156.367V205.633L456.498 230.267L413.81 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M457.13 231.367L499.818 206.733L542.506 231.367V280.633L499.818 305.267L457.13 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M500.452 306.367L543.14 281.733L585.828 306.367V355.633L543.14 380.267L500.452 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M543.775 231.367L586.463 206.733L629.151 231.367V280.633L586.463 305.267L543.775 280.633V231.367Z" fill="white" fillOpacity="0.25" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M500.452 6.36671L543.14 -18.2669L585.828 6.36671V55.6333L543.14 80.2669L500.452 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M760.383 6.36671L803.071 -18.2669L845.759 6.36671V55.6333L803.071 80.2669L760.383 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M847.026 6.36671L889.714 -18.2669L932.402 6.36671V55.6333L889.714 80.2669L847.026 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M890.348 81.3667L933.036 56.7331L975.724 81.3667V130.633L933.036 155.267L890.348 130.633V81.3667Z" fill="white" fillOpacity="0.25" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M933.667 6.36671L976.355 -18.2669L1019.04 6.36671V55.6333L976.355 80.2669L933.667 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M587.095 6.36671L629.783 -18.2669L672.471 6.36671V55.6333L629.783 80.2669L587.095 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M630.416 81.3667L673.104 56.7331L715.792 81.3667V130.633L673.104 155.267L630.416 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M673.738 6.36671L716.426 -18.2669L759.114 6.36671V55.6333L716.426 80.2669L673.738 55.6333V6.36671Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M717.061 81.3667L759.749 56.7331L802.437 81.3667V130.633L759.749 155.267L717.061 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M760.383 156.367L803.071 131.733L845.759 156.367V205.633L803.071 230.267L760.383 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M803.702 81.3667L846.39 56.7331L889.078 81.3667V130.633L846.39 155.267L803.702 130.633V81.3667Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M327.233 606.367L369.899 581.733L412.566 606.367V655.633L369.899 680.267L327.233 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M370.533 681.367L413.199 656.733L455.865 681.367V730.633L413.199 755.267L370.533 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M413.833 606.367L456.499 581.733L499.165 606.367V655.633L456.499 680.267L413.833 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M457.133 681.367L499.799 656.733L542.465 681.367V730.633L499.799 755.267L457.133 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M543.732 681.367L586.398 656.733L629.065 681.367V730.633L586.398 755.267L543.732 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M197.334 681.367L240 656.733L282.666 681.367V730.633L240 755.267L197.334 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M283.933 681.367L326.6 656.733L369.266 681.367V730.633L326.6 755.267L283.933 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M587.032 456.367L629.698 431.733L672.365 456.367V505.633L629.698 530.267L587.032 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M630.332 531.367L672.998 506.733L715.664 531.367V580.633L672.998 605.267L630.332 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M673.632 456.367L716.298 431.733L758.964 456.367V505.633L716.298 530.267L673.632 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M716.931 531.367L759.598 506.733L802.264 531.367V580.633L759.598 605.267L716.931 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M760.231 606.367L802.897 581.733L845.564 606.367V655.633L802.897 680.267L760.231 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M803.531 531.367L846.197 506.733L888.864 531.367V580.633L846.197 605.267L803.531 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M457.133 531.367L499.799 506.733L542.465 531.367V580.633L499.799 605.267L457.133 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M500.432 606.367L543.099 581.733L585.765 606.367V655.633L543.099 680.267L500.432 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M543.732 531.367L586.398 506.733L629.065 531.367V580.633L586.398 605.267L543.732 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M587.032 606.367L629.698 581.733L672.365 606.367V655.633L629.698 680.267L587.032 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M630.332 681.367L672.998 656.733L715.664 681.367V730.633L672.998 755.267L630.332 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M673.632 606.367L716.298 581.733L758.964 606.367V655.633L716.298 680.267L673.632 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M846.831 606.367L889.497 581.733L932.163 606.367V655.633L889.497 680.267L846.831 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M890.131 681.367L932.797 656.733L975.463 681.367V730.633L932.797 755.267L890.131 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M933.43 606.367L976.097 581.733L1018.76 606.367V655.633L976.097 680.267L933.43 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M976.73 681.367L1019.4 656.733L1062.06 681.367V730.633L1019.4 755.267L976.73 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M1063.33 681.367L1106 656.733L1148.66 681.367V730.633L1106 755.267L1063.33 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M716.931 681.367L759.598 656.733L802.264 681.367V730.633L759.598 755.267L716.931 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M803.531 681.367L846.197 656.733L888.864 681.367V730.633L846.197 755.267L803.531 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M-62.7322 381.367L-20.0442 356.733L22.6438 381.367V430.633L-20.0442 455.267L-62.7322 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M-19.4139 456.367L23.2741 431.733L65.9621 456.367V505.633L23.2741 530.267L-19.4139 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M23.9103 381.367L66.5983 356.733L109.286 381.367V430.633L66.5983 455.267L23.9103 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M67.2306 456.367L109.919 431.733L152.607 456.367V505.633L109.919 530.267L67.2306 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M110.553 531.367L153.241 506.733L195.929 531.367V580.633L153.241 605.267L110.553 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M153.875 456.367L196.563 431.733L239.251 456.367V505.633L196.563 530.267L153.875 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M197.195 531.367L239.884 506.733L282.572 531.367V580.633L239.884 605.267L197.195 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M240.517 606.367L283.205 581.733L325.893 606.367V655.633L283.205 680.267L240.517 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M283.839 531.367L326.527 506.733L369.215 531.367V580.633L326.527 605.267L283.839 580.633V531.367Z" fill="white" fillOpacity="0.25" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M-62.7322 531.367L-20.0442 506.733L22.6438 531.367V580.633L-20.0442 605.267L-62.7322 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M-19.4139 606.367L23.2741 581.733L65.9621 606.367V655.633L23.2741 680.267L-19.4139 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M23.9103 531.367L66.5983 506.733L109.286 531.367V580.633L66.5983 605.267L23.9103 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M67.2306 606.367L109.919 581.733L152.607 606.367V655.633L109.919 680.267L67.2306 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M110.553 681.367L153.241 656.733L195.929 681.367V730.633L153.241 755.267L110.553 730.633V681.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M153.875 606.367L196.563 581.733L239.251 606.367V655.633L196.563 680.267L153.875 655.633V606.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M67.2306 156.367L109.919 131.733L152.607 156.367V205.633L109.919 230.267L67.2306 205.633V156.367Z" fill="white" fillOpacity="0.25" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M110.553 231.367L153.241 206.733L195.929 231.367V280.633L153.241 305.267L110.553 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M153.875 156.367L196.563 131.733L239.251 156.367V205.633L196.563 230.267L153.875 205.633V156.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M197.195 231.367L239.884 206.733L282.572 231.367V280.633L239.884 305.267L197.195 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M240.517 306.367L283.205 281.733L325.893 306.367V355.633L283.205 380.267L240.517 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M283.839 231.367L326.527 206.733L369.215 231.367V280.633L326.527 305.267L283.839 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M-62.7322 231.367L-20.0442 206.733L22.6438 231.367V280.633L-20.0442 305.267L-62.7322 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M-19.4139 306.367L23.2741 281.733L65.9621 306.367V355.633L23.2741 380.267L-19.4139 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M23.9103 231.367L66.5983 206.733L109.286 231.367V280.633L66.5983 305.267L23.9103 280.633V231.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M67.2306 306.367L109.919 281.733L152.607 306.367V355.633L109.919 380.267L67.2306 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M110.553 381.367L153.241 356.733L195.929 381.367V430.633L153.241 455.267L110.553 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M153.875 306.367L196.563 281.733L239.251 306.367V355.633L196.563 380.267L153.875 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M327.161 306.367L369.849 281.733L412.537 306.367V355.633L369.849 380.267L327.161 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M370.484 381.367L413.172 356.733L455.86 381.367V430.633L413.172 455.267L370.484 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M413.803 306.367L456.491 281.733L499.179 306.367V355.633L456.491 380.267L413.803 355.633V306.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M457.126 381.367L499.814 356.733L542.502 381.367V430.633L499.814 455.267L457.126 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M500.448 456.367L543.136 431.733L585.824 456.367V505.633L543.136 530.267L500.448 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M543.768 381.367L586.456 356.733L629.144 381.367V430.633L586.456 455.267L543.768 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M197.195 381.367L239.884 356.733L282.572 381.367V430.633L239.884 455.267L197.195 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M240.517 456.367L283.205 431.733L325.893 456.367V505.633L283.205 530.267L240.517 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M283.839 381.367L326.527 356.733L369.215 381.367V430.633L326.527 455.267L283.839 430.633V381.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M327.161 456.367L369.849 431.733L412.537 456.367V505.633L369.849 530.267L327.161 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M370.484 531.367L413.172 506.733L455.86 531.367V580.633L413.172 605.267L370.484 580.633V531.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path><path d="M413.803 456.367L456.491 431.733L499.179 456.367V505.633L456.491 530.267L413.803 505.633V456.367Z" stroke="rgba(255, 255, 255, 1.0)" strokeWidth="1.0"></path></g><g mask="url(#mask0_91_8)"><path d="M717.133 231.367L759.799 206.733L802.465 231.367V280.633L759.799 305.267L717.133 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M760.432 306.367L803.099 281.733L845.765 306.367V355.633L803.099 380.267L760.432 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M803.732 231.367L846.398 206.733L889.065 231.367V280.633L846.398 305.267L803.732 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M847.032 306.367L889.698 281.733L932.365 306.367V355.633L889.698 380.267L847.032 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M890.332 381.367L932.998 356.733L975.664 381.367V430.633L932.998 455.267L890.332 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M933.632 306.367L976.298 281.733L1018.96 306.367V355.633L976.298 380.267L933.632 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M587.233 306.367L629.899 281.733L672.566 306.367V355.633L629.899 380.267L587.233 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M630.533 381.367L673.199 356.733L715.865 381.367V430.633L673.199 455.267L630.533 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M673.833 306.367L716.499 281.733L759.165 306.367V355.633L716.499 380.267L673.833 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M717.133 381.367L759.799 356.733L802.465 381.367V430.633L759.799 455.267L717.133 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M760.432 456.367L803.099 431.733L845.765 456.367V505.633L803.099 530.267L760.432 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M803.732 381.367L846.398 356.733L889.065 381.367V430.633L846.398 455.267L803.732 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M976.931 381.367L1019.6 356.733L1062.26 381.367V430.633L1019.6 455.267L976.931 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1020.23 456.367L1062.9 431.733L1105.56 456.367V505.633L1062.9 530.267L1020.23 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1063.53 381.367L1106.2 356.733L1148.86 381.367V430.633L1106.2 455.267L1063.53 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1106.83 456.367L1149.5 431.733L1192.16 456.367V505.633L1149.5 530.267L1106.83 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1150.13 531.367L1192.8 506.733L1235.46 531.367V580.633L1192.8 605.267L1150.13 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1193.43 456.367L1236.1 431.733L1278.76 456.367V505.633L1236.1 530.267L1193.43 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M847.032 456.367L889.698 431.733L932.365 456.367V505.633L889.698 530.267L847.032 505.633V456.367Z" fill="white" fillOpacity="0.25" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M890.332 531.367L932.998 506.733L975.664 531.367V580.633L932.998 605.267L890.332 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M933.632 456.367L976.298 431.733L1018.96 456.367V505.633L976.298 530.267L933.632 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M976.931 531.367L1019.6 506.733L1062.26 531.367V580.633L1019.6 605.267L976.931 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1020.23 606.367L1062.9 581.733L1105.56 606.367V655.633L1062.9 680.267L1020.23 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1063.53 531.367L1106.2 506.733L1148.86 531.367V580.633L1106.2 605.267L1063.53 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M976.931 81.3666L1019.6 56.7332L1062.26 81.3666V130.633L1019.6 155.267L976.931 130.633V81.3666Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1020.23 156.367L1062.9 131.733L1105.56 156.367V205.633L1062.9 230.267L1020.23 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1063.53 81.3666L1106.2 56.7332L1148.86 81.3666V130.633L1106.2 155.267L1063.53 130.633V81.3666Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1106.83 156.367L1149.5 131.733L1192.16 156.367V205.633L1149.5 230.267L1106.83 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1150.13 231.367L1192.8 206.733L1235.46 231.367V280.633L1192.8 305.267L1150.13 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1193.43 156.367L1236.1 131.733L1278.76 156.367V205.633L1236.1 230.267L1193.43 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M847.032 156.367L889.698 131.733L932.365 156.367V205.633L889.698 230.267L847.032 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M890.332 231.367L932.998 206.733L975.664 231.367V280.633L932.998 305.267L890.332 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M933.632 156.367L976.298 131.733L1018.96 156.367V205.633L976.298 230.267L933.632 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M976.931 231.367L1019.6 206.733L1062.26 231.367V280.633L1019.6 305.267L976.931 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1020.23 306.367L1062.9 281.733L1105.56 306.367V355.633L1062.9 380.267L1020.23 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1063.53 231.367L1106.2 206.733L1148.86 231.367V280.633L1106.2 305.267L1063.53 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1106.83 306.367L1149.5 281.733L1192.16 306.367V355.633L1149.5 380.267L1106.83 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1150.13 381.367L1192.8 356.733L1235.46 381.367V430.633L1192.8 455.267L1150.13 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1193.43 306.367L1236.1 281.733L1278.76 306.367V355.633L1236.1 380.267L1193.43 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M240.523 6.36671L283.211 -18.2669L325.899 6.36671V55.6333L283.211 80.2669L240.523 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M327.167 6.36671L369.855 -18.2669L412.543 6.36671V55.6333L369.855 80.2669L327.167 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M370.486 81.3667L413.174 56.7331L455.862 81.3667V130.633L413.174 155.267L370.486 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M413.81 6.36671L456.498 -18.2669L499.186 6.36671V55.6333L456.498 80.2669L413.81 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M67.2365 6.36671L109.925 -18.2669L152.613 6.36671V55.6333L109.925 80.2669L67.2365 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M110.558 81.3667L153.246 56.7331L195.934 81.3667V130.633L153.246 155.267L110.558 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M153.88 6.36671L196.568 -18.2669L239.256 6.36671V55.6333L196.568 80.2669L153.88 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M197.201 81.3667L239.889 56.7331L282.577 81.3667V130.633L239.889 155.267L197.201 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M240.523 156.367L283.211 131.733L325.899 156.367V205.633L283.211 230.267L240.523 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M283.845 81.3667L326.533 56.7331L369.221 81.3667V130.633L326.533 155.267L283.845 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M457.13 81.3667L499.818 56.7331L542.506 81.3667V130.633L499.818 155.267L457.13 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M500.452 156.367L543.14 131.733L585.828 156.367V205.633L543.14 230.267L500.452 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M543.775 81.3667L586.463 56.7331L629.151 81.3667V130.633L586.463 155.267L543.775 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M587.095 156.367L629.783 131.733L672.471 156.367V205.633L629.783 230.267L587.095 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M630.416 231.367L673.104 206.733L715.792 231.367V280.633L673.104 305.267L630.416 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M673.738 156.367L716.426 131.733L759.114 156.367V205.633L716.426 230.267L673.738 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M327.167 156.367L369.855 131.733L412.543 156.367V205.633L369.855 230.267L327.167 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M370.486 231.367L413.174 206.733L455.862 231.367V280.633L413.174 305.267L370.486 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M413.81 156.367L456.498 131.733L499.186 156.367V205.633L456.498 230.267L413.81 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M457.13 231.367L499.818 206.733L542.506 231.367V280.633L499.818 305.267L457.13 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M500.452 306.367L543.14 281.733L585.828 306.367V355.633L543.14 380.267L500.452 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M543.775 231.367L586.463 206.733L629.151 231.367V280.633L586.463 305.267L543.775 280.633V231.367Z" fill="white" fillOpacity="0.25" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M500.452 6.36671L543.14 -18.2669L585.828 6.36671V55.6333L543.14 80.2669L500.452 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M760.383 6.36671L803.071 -18.2669L845.759 6.36671V55.6333L803.071 80.2669L760.383 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M847.026 6.36671L889.714 -18.2669L932.402 6.36671V55.6333L889.714 80.2669L847.026 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M890.348 81.3667L933.036 56.7331L975.724 81.3667V130.633L933.036 155.267L890.348 130.633V81.3667Z" fill="white" fillOpacity="0.25" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M933.667 6.36671L976.355 -18.2669L1019.04 6.36671V55.6333L976.355 80.2669L933.667 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M587.095 6.36671L629.783 -18.2669L672.471 6.36671V55.6333L629.783 80.2669L587.095 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M630.416 81.3667L673.104 56.7331L715.792 81.3667V130.633L673.104 155.267L630.416 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M673.738 6.36671L716.426 -18.2669L759.114 6.36671V55.6333L716.426 80.2669L673.738 55.6333V6.36671Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M717.061 81.3667L759.749 56.7331L802.437 81.3667V130.633L759.749 155.267L717.061 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M760.383 156.367L803.071 131.733L845.759 156.367V205.633L803.071 230.267L760.383 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M803.702 81.3667L846.39 56.7331L889.078 81.3667V130.633L846.39 155.267L803.702 130.633V81.3667Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M327.233 606.367L369.899 581.733L412.566 606.367V655.633L369.899 680.267L327.233 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M370.533 681.367L413.199 656.733L455.865 681.367V730.633L413.199 755.267L370.533 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M413.833 606.367L456.499 581.733L499.165 606.367V655.633L456.499 680.267L413.833 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M457.133 681.367L499.799 656.733L542.465 681.367V730.633L499.799 755.267L457.133 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M543.732 681.367L586.398 656.733L629.065 681.367V730.633L586.398 755.267L543.732 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M197.334 681.367L240 656.733L282.666 681.367V730.633L240 755.267L197.334 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M283.933 681.367L326.6 656.733L369.266 681.367V730.633L326.6 755.267L283.933 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M587.032 456.367L629.698 431.733L672.365 456.367V505.633L629.698 530.267L587.032 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M630.332 531.367L672.998 506.733L715.664 531.367V580.633L672.998 605.267L630.332 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M673.632 456.367L716.298 431.733L758.964 456.367V505.633L716.298 530.267L673.632 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M716.931 531.367L759.598 506.733L802.264 531.367V580.633L759.598 605.267L716.931 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M760.231 606.367L802.897 581.733L845.564 606.367V655.633L802.897 680.267L760.231 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M803.531 531.367L846.197 506.733L888.864 531.367V580.633L846.197 605.267L803.531 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M457.133 531.367L499.799 506.733L542.465 531.367V580.633L499.799 605.267L457.133 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M500.432 606.367L543.099 581.733L585.765 606.367V655.633L543.099 680.267L500.432 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M543.732 531.367L586.398 506.733L629.065 531.367V580.633L586.398 605.267L543.732 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M587.032 606.367L629.698 581.733L672.365 606.367V655.633L629.698 680.267L587.032 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M630.332 681.367L672.998 656.733L715.664 681.367V730.633L672.998 755.267L630.332 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M673.632 606.367L716.298 581.733L758.964 606.367V655.633L716.298 680.267L673.632 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M846.831 606.367L889.497 581.733L932.163 606.367V655.633L889.497 680.267L846.831 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M890.131 681.367L932.797 656.733L975.463 681.367V730.633L932.797 755.267L890.131 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M933.43 606.367L976.097 581.733L1018.76 606.367V655.633L976.097 680.267L933.43 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M976.73 681.367L1019.4 656.733L1062.06 681.367V730.633L1019.4 755.267L976.73 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M1063.33 681.367L1106 656.733L1148.66 681.367V730.633L1106 755.267L1063.33 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M716.931 681.367L759.598 656.733L802.264 681.367V730.633L759.598 755.267L716.931 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M803.531 681.367L846.197 656.733L888.864 681.367V730.633L846.197 755.267L803.531 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M-62.7322 381.367L-20.0442 356.733L22.6438 381.367V430.633L-20.0442 455.267L-62.7322 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M-19.4139 456.367L23.2741 431.733L65.9621 456.367V505.633L23.2741 530.267L-19.4139 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M23.9103 381.367L66.5983 356.733L109.286 381.367V430.633L66.5983 455.267L23.9103 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M67.2306 456.367L109.919 431.733L152.607 456.367V505.633L109.919 530.267L67.2306 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M110.553 531.367L153.241 506.733L195.929 531.367V580.633L153.241 605.267L110.553 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M153.875 456.367L196.563 431.733L239.251 456.367V505.633L196.563 530.267L153.875 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M197.195 531.367L239.884 506.733L282.572 531.367V580.633L239.884 605.267L197.195 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M240.517 606.367L283.205 581.733L325.893 606.367V655.633L283.205 680.267L240.517 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M283.839 531.367L326.527 506.733L369.215 531.367V580.633L326.527 605.267L283.839 580.633V531.367Z" fill="white" fillOpacity="0.25" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M-62.7322 531.367L-20.0442 506.733L22.6438 531.367V580.633L-20.0442 605.267L-62.7322 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M-19.4139 606.367L23.2741 581.733L65.9621 606.367V655.633L23.2741 680.267L-19.4139 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M23.9103 531.367L66.5983 506.733L109.286 531.367V580.633L66.5983 605.267L23.9103 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M67.2306 606.367L109.919 581.733L152.607 606.367V655.633L109.919 680.267L67.2306 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M110.553 681.367L153.241 656.733L195.929 681.367V730.633L153.241 755.267L110.553 730.633V681.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M153.875 606.367L196.563 581.733L239.251 606.367V655.633L196.563 680.267L153.875 655.633V606.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M67.2306 156.367L109.919 131.733L152.607 156.367V205.633L109.919 230.267L67.2306 205.633V156.367Z" fill="white" fillOpacity="0.25" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M110.553 231.367L153.241 206.733L195.929 231.367V280.633L153.241 305.267L110.553 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M153.875 156.367L196.563 131.733L239.251 156.367V205.633L196.563 230.267L153.875 205.633V156.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M197.195 231.367L239.884 206.733L282.572 231.367V280.633L239.884 305.267L197.195 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M240.517 306.367L283.205 281.733L325.893 306.367V355.633L283.205 380.267L240.517 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M283.839 231.367L326.527 206.733L369.215 231.367V280.633L326.527 305.267L283.839 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M-62.7322 231.367L-20.0442 206.733L22.6438 231.367V280.633L-20.0442 305.267L-62.7322 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M-19.4139 306.367L23.2741 281.733L65.9621 306.367V355.633L23.2741 380.267L-19.4139 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M23.9103 231.367L66.5983 206.733L109.286 231.367V280.633L66.5983 305.267L23.9103 280.633V231.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M67.2306 306.367L109.919 281.733L152.607 306.367V355.633L109.919 380.267L67.2306 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M110.553 381.367L153.241 356.733L195.929 381.367V430.633L153.241 455.267L110.553 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M153.875 306.367L196.563 281.733L239.251 306.367V355.633L196.563 380.267L153.875 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M327.161 306.367L369.849 281.733L412.537 306.367V355.633L369.849 380.267L327.161 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M370.484 381.367L413.172 356.733L455.86 381.367V430.633L413.172 455.267L370.484 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M413.803 306.367L456.491 281.733L499.179 306.367V355.633L456.491 380.267L413.803 355.633V306.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M457.126 381.367L499.814 356.733L542.502 381.367V430.633L499.814 455.267L457.126 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M500.448 456.367L543.136 431.733L585.824 456.367V505.633L543.136 530.267L500.448 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M543.768 381.367L586.456 356.733L629.144 381.367V430.633L586.456 455.267L543.768 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M197.195 381.367L239.884 356.733L282.572 381.367V430.633L239.884 455.267L197.195 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M240.517 456.367L283.205 431.733L325.893 456.367V505.633L283.205 530.267L240.517 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M283.839 381.367L326.527 356.733L369.215 381.367V430.633L326.527 455.267L283.839 430.633V381.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M327.161 456.367L369.849 431.733L412.537 456.367V505.633L369.849 530.267L327.161 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M370.484 531.367L413.172 506.733L455.86 531.367V580.633L413.172 605.267L370.484 580.633V531.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path><path d="M413.803 456.367L456.491 431.733L499.179 456.367V505.633L456.491 530.267L413.803 505.633V456.367Z" stroke="rgba(0, 0, 0, 1.0)" strokeWidth="1.0"></path></g><defs><radialGradient id="paint0_radial_91_8" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(608 362.9) rotate(90) scale(447.374 749.527)"><stop stopColor="#D9D9D9" stopOpacity="0.1"></stop><stop offset="0.802083" stopColor="#D9D9D9" stopOpacity="0"></stop></radialGradient></defs></svg>
            </div>
            <ContentSection
                title="Truyện Mới Đăng"
                items={latestComics}
                itemType="comic"
                loading={loadingStates.latestComics}
                sectionId="latest-comics-section"
                viewMoreLink="/truyen-tranh?sort=createdAt_desc"
                loadingItemCount={ITEMS_FOR_COMICS_SECTION}
                icon={<i className="fa-regular fa-book-reader"></i>}
            />
            
            <ContentSection
                title="Anime Thịnh Hành"
                items={trendingAnime}
                itemType="film"
                loading={loadingStates.trendingAnime}
                sectionId="trending-anime-section"
                viewMoreLink="/anime?sort=popular"
                loadingItemCount={ITEMS_FOR_ANIME_SECTION}
                icon={<i className="fas fa-fire"></i>}
            />

            <div className="film-area pt-60">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-9">
                            <div className="row flexbox-center mb-3">
                                <div className="col-lg-6 text-center text-lg-start">
                                    <div className="section-title">
                                        <h3><i className="fa-regular fa-rectangle-list me-2"></i>
                                            {currentSortForMainList === 'popular' ? "Phim Phổ Biến" : "Phim Mới Nhất"}
                                        </h3>
                                    </div>
                                </div>
                                <div className="col-lg-6 text-center text-lg-end">
                                    <ul className="film-menu">
                                        <li
                                            className={currentSortForMainList === 'latest' ? 'active' : ''}
                                            onClick={(e) => handleMainListFilterChange(e,'latest')}
                                            disabled={loadingStates.mainMovies}>
                                            Mới nhất
                                        </li>
                                        <li
                                            className={currentSortForMainList === 'popular' ? 'active' : ''}
                                            onClick={(e) => handleMainListFilterChange(e,'popular')}
                                            disabled={loadingStates.mainMovies}>
                                            Phổ biến
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <hr className="mb-4" />
                            {loadingStates.mainMovies && mainMovieList.length === 0 ? (
                                <MainListSkeletonLoader itemCount={ITEMS_PER_MAIN_LIST / 2} />
                            ) : !loadingStates.mainMovies && mainMovieList.length === 0 ? (
                                <Alert variant="info" className="text-center">Không có phim nào để hiển thị.</Alert>
                            ) : (
                                <>
                                    <div className="row film-item g-3" id={`film-${currentSortForMainList}`} ref={mainListRef}>
                                        {mainMovieList.map((movie) => (
                                            <div key={`main-list-${movie.id}`} className="col-6 col-md-4 col-lg-4 col-xl-3">
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

                        <div className="col-lg-3">
                            <div className="film-sidebar">
                                {loadingStates.sidebarFeatured ? (
                                    <SidebarSkeletonLoader itemCount={ITEMS_FOR_SIDEBAR_FEATURED / 2} title="Phim nổi bật tuần" />
                                ) : featuredForSidebar.length > 0 ? (
                                    <section className="film-sidebar__section">
                                        <div className="film-sidebar__title">
                                            Phim nổi bật tuần
                                        </div>
                                        <ul className="film-sidebar__list">
                                            {featuredForSidebar.map((movie) => {
                                                const lastEpisodeNumber = movie.Episodes?.[0]?.episodeNumber || (movie.belongToCategory === 1 ? '?' : '');
                                                return (
                                                    <li className="film-sidebar__item" key={`sidebar-${movie.id}`}>
                                                        <Link to={`/album/${movie.slug}`} className="film-sidebar__link" title={movie.title}>
                                                            <div>
                                                                <span className="film-sidebar__name">{movie.title}</span>
                                                            </div>
                                                            {movie.belongToCategory === 1 && (
                                                                <span className="film-sidebar__episode">Tập {lastEpisodeNumber}</span>
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ContentSection
                title="Phim Lẻ Hot"
                items={topSingleMovies}
                isLoading={loadingStates.sections}
                viewMoreLink="/muc-luc?category=phim-le&sort=views_desc"
                sectionId="top-single-movies"
                loadingItemCount={ITEMS_PER_SECTION_DEFAULT.topSingleMovies}
                layout="scrollable-row"
            />

            <ContentSection
                title="Phim Bộ Hot"
                items={topSeriesMovies}
                isLoading={loadingStates.sections}
                viewMoreLink="/muc-luc?category=phim-bo&sort=views_desc"
                sectionId="top-series-movies"
                loadingItemCount={ITEMS_PER_SECTION_DEFAULT.topSeriesMovies}
                layout="scrollable-row"
            />
        </>
    );
}

export default HomePage;