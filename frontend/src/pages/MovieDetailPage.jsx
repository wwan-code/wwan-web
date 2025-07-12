import api from "@services/api";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";

import useLastEpisode from "@hooks/useLastEpisode";
import useImageBorderShadow from "@hooks/useImageBorderShadow";
import authHeader from "@services/auth-header";
import classNames from "@utils/classNames";

import ReviewForm from '@components/Review/ReviewForm';
import ReviewList from '@components/Review/ReviewList';
import AddToCollectionModal from '@components/Modal/AddToCollectionModal';
import { handleApiError } from "@utils/handleApiError";
import { FaChevronDown, FaChevronUp, FaComment, FaMinus, FaPlus, FaRegHeart, FaShare, FaUser } from "react-icons/fa6";
import { FaUserFriends } from "react-icons/fa";

const MovieDetailPage = () => {
    const { slug } = useParams();
    const { user: currentUser, isLoggedIn } = useSelector((state) => state.user);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('episodes');
    const [isFollowing, setIsFollowing] = useState(false);

    const [reviews, setReviews] = useState([]);
    const [reviewLikeLoading, setReviewLikeLoading] = useState({});
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [reviewsError, setReviewsError] = useState(null);
    const [reviewPagination, setReviewPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
    });
    const [currentSort, setCurrentSort] = useState('newest');
    const [userRating, setUserRating] = useState(0);
    const [userReviewContent, setUserReviewContent] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [userExistingReview, setUserExistingReview] = useState(null);
    const [loadingExistingReview, setLoadingExistingReview] = useState(false);

    const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);
    const [showMeta, setShowMeta] = useState(true);
    const [descExpanded, setDescExpanded] = useState(false);
    const lastEpisode = useLastEpisode(data?.movie?.Episodes);

    const fetchAlbumData = useCallback(async () => {
        setLoading(true);
        setLoadingExistingReview(true);
        try {
            const response = await api.get(`/album-movie/${slug}`, { headers: authHeader() });
            const fetchedData = response.data;

            if (!fetchedData || !fetchedData.movie) {
                throw new Error("Không tìm thấy dữ liệu phim.");
            }
            setData(fetchedData);
            setIsFollowing(fetchedData.isFollowed);

            if (isLoggedIn && fetchedData.movie?.id) {
                try {
                    const reviewRes = await api.get(`/movies/${fetchedData.movie.id}/my-review`, { headers: authHeader() });
                    if (reviewRes.data.success && reviewRes.data.rating) {
                        setUserExistingReview(reviewRes.data.rating);
                        setUserRating(reviewRes.data.rating.rating || 0);
                        setUserReviewContent(reviewRes.data.rating.reviewContent || '');
                    } else {
                        setUserExistingReview(null);
                        setUserRating(0);
                        setUserReviewContent('');
                    }
                } catch (reviewError) {
                    console.error("Error fetching user's existing review:", reviewError);
                    setUserExistingReview(null);
                    setUserRating(0);
                    setUserReviewContent('');
                }
            } else {
                setUserExistingReview(null);
                setUserRating(0);
                setUserReviewContent('');
            }

        } catch (error) {
            handleApiError(error, `tải dữ liệu phim "${slug}"`);
            setData(null);
        } finally {
            setLoading(false);
            setLoadingExistingReview(false);
        }
    }, [slug, isLoggedIn, handleApiError]);

    useEffect(() => {
        fetchAlbumData();
    }, [fetchAlbumData]);

    const fetchReviews = useCallback(async (page = 1, sort = 'newest') => {
        if (!data?.movie?.id) return;

        setReviewsLoading(true);
        setReviewsError(null);
        try {
            const response = await api.get(`/movies/${data.movie.id}/reviews`, {
                params: {
                    page: page,
                    limit: reviewPagination.itemsPerPage,
                    sort: sort
                }
            });

            if (response.data.success) {
                const reviews = (response.data.reviews || []).map(r => ({
                    ...r,
                    likes: typeof r.likes === 'string' ? (() => {
                        try { return JSON.parse(r.likes); } catch { return []; }
                    })() : (Array.isArray(r.likes) ? r.likes : [])
                }));
                setReviews(reviews);
                setReviewPagination(response.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
            } else {
                throw new Error(response.data.message || "Lỗi tải đánh giá phim.");
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
            setReviewsError("Không thể tải danh sách đánh giá.");
        } finally {
            setReviewsLoading(false);
        }
    }, [data?.movie?.id, reviewPagination.itemsPerPage]);

    useEffect(() => {
        if (data?.movie?.id) {
            fetchReviews(reviewPagination.currentPage, currentSort);
        }
    }, [data?.movie?.id, reviewPagination.currentPage, currentSort, fetchReviews]);

    // --- Logic Follow/Unfollow ---
    const handleFollowClick = async () => {
        if (!currentUser || !data?.movie) {
            toast.error("Vui lòng đăng nhập để theo dõi phim.");
            return;
        }

        const originalIsFollowed = isFollowing;
        const originalFollowCount = data.totalFollows;

        // Cập nhật UI lạc quan
        const newFollowState = !originalIsFollowed;
        setIsFollowing(newFollowState);
        setData(prevData => ({
            ...prevData,
            isFollowed: newFollowState,
            totalFollows: prevData.totalFollows + (newFollowState ? 1 : -1)
        }));

        try {
            let response;
            const payload = { userId: currentUser.id, movieId: data.movie.id };

            if (originalIsFollowed) {
                response = await api.delete('/follow-movie/delete', {
                    data: payload,
                    headers: authHeader()
                });
                if (response.data.success && typeof response.data.newTotalFollows === 'number') {
                    setData(prev => ({ ...prev, totalFollows: response.data.newTotalFollows }));
                }
            } else {
                response = await api.post('/follow-movie', payload, { headers: authHeader() });
                if (response.data.success && typeof response.data.newTotalFollows === 'number') {
                    setData(prev => ({ ...prev, totalFollows: response.data.newTotalFollows }));
                }
            }

            toast.success(response.data.message || (newFollowState ? 'Theo dõi thành công!' : 'Bỏ theo dõi thành công!'));

        } catch (error) {
            handleApiError(error, newFollowState ? "theo dõi" : "bỏ theo dõi");
            setIsFollowing(originalIsFollowed);
            setData(prevData => ({
                ...prevData,
                isFollowed: originalIsFollowed,
                totalFollows: originalFollowCount
            }));
        }
    };

    const handleSortChange = (newSort) => {
        if (newSort !== currentSort) {
            setCurrentSort(newSort);
            setReviewPagination(prev => ({ ...prev, currentPage: 1 }));
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage !== reviewPagination.currentPage) {
            setReviewPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    const handleReviewSubmit = async ({ rating, reviewContent }) => {
        if (!isLoggedIn) {
            toast.info("Vui lòng đăng nhập để gửi đánh giá.");
            return;
        }
        if (rating === 0) {
            toast.warn("Vui lòng chọn số sao đánh giá.");
            return;
        }
        if (!data?.movie?.id) return;

        setIsSubmittingReview(true);
        try {
            const payload = {
                movieId: data.movie.id,
                rating: rating,
                reviewContent: reviewContent.trim()
            };
            const response = await api.post('/ratings', payload, { headers: authHeader() });

            if (response.data.success) {
                toast.success(response.data.message || "Gửi đánh giá thành công!");
                setUserExistingReview(response.data.rating);
                fetchReviews(1, 'newest');
                setCurrentSort('newest');
            } else {
                throw new Error(response.data.message || "Gửi đánh giá thất bại.");
            }
        } catch (error) {
            handleApiError(error, "gửi đánh giá");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleLikeReview = useCallback(async (reviewId) => {
        if (!isLoggedIn) {
            toast.info("Vui lòng đăng nhập để thích đánh giá.");
            return;
        }
        if (reviewLikeLoading[reviewId]) {
            return;
        }

        let originalLikes = [];
        let optimisticLikes = [];
        let isCurrentlyLiked = false;

        setReviewLikeLoading(prev => ({ ...prev, [reviewId]: true }));

        setReviews(prevReviews => {
            return prevReviews.map(r => {
                if (r.id === reviewId) {
                    let likesArray = [];
                    if (typeof r.likes === 'string') {
                        try {
                            likesArray = JSON.parse(r.likes);
                        } catch {
                            likesArray = [];
                        }
                    } else if (Array.isArray(r.likes)) {
                        likesArray = r.likes;
                    } else {
                        likesArray = [];
                    }
                    originalLikes = Array.isArray(likesArray) ? [...likesArray] : [];
                    const userIndex = originalLikes.indexOf(currentUser.id);
                    isCurrentlyLiked = userIndex > -1;

                    if (isCurrentlyLiked) {
                        optimisticLikes = originalLikes.filter(userId => userId !== currentUser.id);
                    } else {
                        optimisticLikes = [...originalLikes, currentUser.id];
                    }
                    return { ...r, likes: optimisticLikes };
                }
                return r;
            });
        });

        try {
            const response = await api.post(`/ratings/${reviewId}/like`, {}, { headers: authHeader() });

            if (!response.data.success) {
                throw new Error(response.data.message || "Thao tác like/unlike thất bại.");
            }

        } catch (error) {
            handleApiError(error, isCurrentlyLiked ? "Bỏ thích" : "Thích");
            setReviews(prevReviews => prevReviews.map(r => {
                if (r.id === reviewId) {
                    return { ...r, likes: originalLikes };
                }
                return r;
            }));
        } finally {
            setReviewLikeLoading(prev => ({ ...prev, [reviewId]: false }));
        }
    }, [isLoggedIn, currentUser?.id, handleApiError, reviewLikeLoading]);

    const handleDeleteReview = useCallback(async (reviewId) => {
        if (!isLoggedIn) {
            toast.info("Vui lòng đăng nhập.");
            return;
        }
        try {
            const response = await api.delete(`/ratings/${reviewId}`, { headers: authHeader() });

            if (response.data.success) {
                toast.success(response.data.message || "Đã xóa đánh giá.");
                setReviews(prevReviews => prevReviews.filter(r => r.id !== reviewId));
                setReviewPagination(prev => ({
                    ...prev,
                    totalItems: Math.max(0, prev.totalItems - 1)
                }));
                if (userExistingReview?.id === reviewId) {
                    setUserExistingReview(null);
                    setUserRating(0);
                    setUserReviewContent('');
                }
            } else {
                throw new Error(response.data.message || "Xóa đánh giá thất bại.");
            }
        } catch (error) {
            handleApiError(error, "Xóa đánh giá");
        }
    }, [isLoggedIn, handleApiError, userExistingReview?.id]);

    const { imgRef, shadowStyle } = useImageBorderShadow(data?.movie?.posterURL);

    useEffect(() => {
        if (data?.movie?.title) {
            document.title = `${data.movie.title} - WWAN Film`;
        } else if (!loading) {
            document.title = 'Không tìm thấy phim - WWAN Film';
        }
    }, [data?.movie?.title, loading]);

    // Responsive: auto show/hide meta on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 992) {
                setShowMeta(false);
            } else {
                setShowMeta(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) {
        return (
            <div className="loader-overlay">
                <div id="container-loader">
                    <div className="loader-box" id="loader1"></div>
                    <div className="loader-box" id="loader2"></div>
                    <div className="loader-box" id="loader3"></div>
                    <div className="loader-box" id="loader4"></div>
                    <div className="loader-box" id="loader5"></div>
                </div>
            </div>
        );
    }

    if (!data || !data.movie) {
        return (
            <div className="container text-center py-5">
                <h2>Oops!</h2>
                <p>Không tìm thấy thông tin cho bộ phim này.</p>
                <Link to="/" className="btn btn-primary">Về Trang Chủ</Link>
            </div>
        );
    }

    const { movie } = data;

    return (
        <div className="page-wrapper">
            <div className="background-hero">
                <div
                    className="background-hero__image"
                    style={{
                        backgroundImage: movie.bannerURL
                            ? `url(${process.env.REACT_APP_API_URL_IMAGE}/${movie.bannerURL})`
                            : "none"
                    }}
                ></div>
                <div className="background-hero__overlay"></div>
            </div>

            <div className="movie-detail">
                <main className="movie-detail-content">
                    <aside className="movie-detail-content__sidebar">
                        <div className="movie-poster">
                            <div className="movie-poster__cover" style={{ boxShadow: shadowStyle }}>
                                <picture className="movie-poster__picture">
                                    <source srcSet={movie.posterURL ? `${process.env.REACT_APP_API_URL_IMAGE}/${movie.posterURL}` : ''} type="image/webp" />
                                    <img ref={imgRef} src={movie.posterURL ? `${process.env.REACT_APP_API_URL_IMAGE}/${movie.posterURL}` : '/placeholder.jpg'} alt={movie.title} loading='lazy' />
                                </picture>
                            </div>
                        </div>
                        <h2 className="movie-title">{movie.title}</h2>
                        <p className="movie-subtitle">{movie.subTitle}</p>
                        <button
                            className="movie-meta-toggle-btn"
                            type="button"
                            aria-expanded={showMeta}
                            aria-controls="movie-meta"
                            onClick={() => setShowMeta(v => !v)}
                        >
                            {showMeta ? <><FaChevronUp /> Ẩn thông tin</> : <><FaChevronDown /> Hiển thị thông tin</>}
                        </button>
                        <div
                            className="movie-meta"
                            id="movie-meta"
                            style={{
                                display: showMeta ? 'block' : 'none'
                            }}
                        >
                            <div className="movie-meta__tags">
                                {movie.classification && <span className="tag">{movie.classification}</span>}
                                {movie.year && <span className="tag">{movie.year}</span>}
                                {movie.sections?.title && <span className="tag">{movie.sections.title}</span>}
                                {lastEpisode?.episodeNumber && <span className="tag">Tập {lastEpisode.episodeNumber}</span>}
                                {movie.views && <span className="tag">Lượt xem: {movie.views.toLocaleString('vi-VN')}</span>}
                                {data.totalFollows && <span className="tag"><FaUserFriends/> {data.totalFollows.toLocaleString('vi-VN')}</span>}
                            </div>
                            <div className="movie-meta__genres">
                                {movie.genres && movie.genres.length > 0
                                    ? movie.genres.map((g, i) => (
                                        <Link key={g.id} to={`/the-loai/${g.slug}`}>
                                            {g.title}
                                        </Link>
                                    ))
                                    : <span>Chưa rõ thể loại</span>
                                }
                            </div>
                            <div className="movie-meta__info-block">
                                <h3>Tóm tắt:</h3>
                                <div
                                    id="description-wrapper"
                                    className={`description-wrapper${!descExpanded && movie.description && movie.description.length > 200 ? ' description-wrapper--collapsed' : ''}`}
                                >
                                    {movie.description
                                        ? <p
                                            dangerouslySetInnerHTML={{
                                                __html: descExpanded || movie.description.length <= 200
                                                    ? movie.description.replace(/\n/g, '<br />')
                                                    : movie.description.slice(0, 200).replace(/\n/g, '<br />') + '...'
                                            }}
                                        ></p>
                                        : <p className="text-muted">Chưa có mô tả cho bộ phim này.</p>
                                    }
                                </div>
                                {movie.description && movie.description.length > 200 && (
                                    <button
                                        id="description-toggle"
                                        className="description-toggle-button"
                                        aria-expanded={descExpanded}
                                        aria-controls="description-wrapper"
                                        type="button"
                                        onClick={() => setDescExpanded(v => !v)}
                                        style={{ display: 'block' }}
                                    >
                                        {descExpanded ? 'Thu gọn' : 'Xem thêm'}
                                    </button>
                                )}
                                <p><strong>Thời lượng:</strong> {movie.duration || 'N/A'}</p>
                                <p><strong>Quốc gia:</strong> {movie.countries?.title
                                    ? <Link to={`/country/${movie.countries.slug}`}>{movie.countries.title}</Link>
                                    : 'N/A'}
                                </p>
                                <p><strong>Khởi chiếu:</strong> {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('vi-VN') : 'N/A'}</p>
                                <p><strong>Theo dõi:</strong> {data.totalFollows || 0}</p>
                                <p><strong>Số tập:</strong> {lastEpisode?.episodeNumber || 'N/A'}/{movie.totalEpisodes || '?'}</p>
                            </div>
                        </div>
                    </aside>

                    <section className="movie-detail-content__body">
                        <div className="actions">
                            {lastEpisode?.episodeNumber && (
                                <Link
                                    to={`/play/${movie.slug}?t=${lastEpisode.episodeNumber}`}
                                    className="actions__button--primary"
                                >
                                    <i className="fas fa-play" aria-hidden="true"></i> Xem Ngay
                                </Link>
                            )}
                            <div className="actions__group">
                                <button
                                    className={`actions__button--secondary ${isFollowing ? 'active' : ''}`}
                                    title={isFollowing ? "Bỏ theo dõi" : "Theo dõi"}
                                    aria-label={isFollowing ? "Bỏ theo dõi" : "Theo dõi"}
                                    onClick={handleFollowClick}
                                >
                                    <i className={`fas ${isFollowing ? 'fa-heart-broken' : 'fa-heart'}`} aria-hidden="true"></i>
                                    Theo dõi
                                </button>
                                {isLoggedIn && (
                                    <button
                                        className="actions__button--secondary"
                                        title="Thêm vào danh sách"
                                        aria-label="Thêm vào danh sách"
                                        onClick={() => setShowAddToCollectionModal(true)}
                                    >
                                        <i className="fas fa-plus" aria-hidden="true"></i>
                                        Thêm vào
                                    </button>
                                )}
                            </div>
                            <div className="actions__rating">
                                <i className="fas fa-star" aria-hidden="true"></i>
                                <span>{data.averageRating?.toFixed(1) || 'N/A'}</span>
                                <span>/ Đánh giá</span>
                            </div>
                        </div>

                        {/* Notification bar nếu có thể lấy thông tin tập mới */}
                        {/* <div className="notification-bar">
                            <p><i className="fas fa-bell" aria-hidden="true"></i> Tập mới sẽ phát sóng ngày ...</p>
                        </div> */}

                        <div className="episode-selector">
                            <div className="episode-selector__tabs">
                                <nav role="tablist" aria-label="Lựa chọn nội dung phim">
                                    <button
                                        role="tab"
                                        id="episodes-tab"
                                        className={`tab-item${activeTab === 'episodes' ? ' active' : ''}`}
                                        onClick={() => setActiveTab('episodes')}
                                    >Chọn tập để cày</button>
                                    <button
                                        role="tab"
                                        id="trailer-tab"
                                        className={`tab-item${activeTab === 'trailer' ? ' active' : ''}`}
                                        onClick={() => setActiveTab('trailer')}
                                    >Trailer</button>
                                    <button
                                        role="tab"
                                        id="related-tab"
                                        className={`tab-item${activeTab === 'related' ? ' active' : ''}`}
                                        onClick={() => setActiveTab('related')}
                                    >Xem xong đỡ ghiền</button>
                                </nav>
                            </div>
                            <div className="tab-content">
                                <div
                                    id="episodes-content"
                                    role="tabpanel"
                                    aria-labelledby="episodes-tab"
                                    style={{ display: activeTab === 'episodes' ? 'block' : 'none' }}
                                >
                                    <div className="episode-selector__options">
                                        {/* Có thể render các lựa chọn phần/phụ đề nếu có */}
                                    </div>
                                    <div className="episode-selector__list">
                                        {movie.Episodes && movie.Episodes.length > 0 ? (
                                            movie.Episodes.map(ep => (
                                                <Link
                                                    key={ep.id}
                                                    to={`/play/${movie.slug}?t=${ep.episodeNumber}`}
                                                    className="episode-item"
                                                    aria-current={lastEpisode?.episodeNumber === ep.episodeNumber ? "page" : undefined}
                                                >
                                                    Tập {ep.episodeNumber}
                                                </Link>
                                            ))
                                        ) : (
                                            <span>Chưa có tập phim</span>
                                        )}
                                    </div>
                                </div>
                                <div
                                    id="trailer-content"
                                    role="tabpanel"
                                    aria-labelledby="trailer-tab"
                                    style={{ display: activeTab === 'trailer' ? 'block' : 'none' }}
                                >
                                    {movie.trailerUrl ? (
                                        <iframe
                                            style={{ width: '100%', height: '500px' }}
                                            src={`https://www.youtube.com/embed/${movie.trailerUrl}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
                                    ) : (
                                        <p className="text-center">Chưa có trailer.</p>
                                    )}
                                </div>
                                <div
                                    id="related-content"
                                    role="tabpanel"
                                    aria-labelledby="related-tab"
                                    style={{ display: activeTab === 'related' ? 'block' : 'none' }}
                                >
                                    <p style={{ textAlign: "center", padding: "2rem" }}>Xem xong rồi thì đi ngủ đi, ghiền gì nữa!</p>
                                </div>
                            </div>
                        </div>

                        <div className="comment-section">
                            <div className="comment-section__header">
                                <h2>Đánh giá ({reviewPagination.totalItems || 0})</h2>
                            </div>
                            {!isLoggedIn && (
                                <p>Vui lòng <Link to="/login">đăng nhập</Link> để tham gia bàn luận.</p>
                            )}
                            {isLoggedIn && (
                                <ReviewForm
                                    movieId={movie.id}
                                    initialRating={userRating}
                                    initialContent={userReviewContent}
                                    onSubmit={handleReviewSubmit}
                                    isSubmitting={isSubmittingReview}
                                    existingReviewId={userExistingReview?.id}
                                />
                            )}
                            <ReviewList
                                reviews={reviews}
                                loading={reviewsLoading}
                                error={reviewsError}
                                pagination={reviewPagination}
                                currentSort={currentSort}
                                onSortChange={handleSortChange}
                                onPageChange={handlePageChange}
                                currentUser={currentUser}
                                onLikeReview={handleLikeReview}
                                onDeleteReview={handleDeleteReview}
                                reviewLikeLoading={reviewLikeLoading}
                            />
                        </div>
                    </section>
                </main>
            </div>
            {isLoggedIn && movie && (
                <AddToCollectionModal
                    show={showAddToCollectionModal}
                    onHide={() => setShowAddToCollectionModal(false)}
                    itemType={'movie'}
                    itemId={movie.id}
                    itemTitle={movie.title}
                />
            )}
        </div>
    );
};

export default MovieDetailPage;