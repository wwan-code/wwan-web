// src/pages/ComicReaderPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import NProgress from 'nprogress';
import { handleApiError } from '@utils/handleApiError';
import '@assets/scss/ComicReaderPage.scss';

const ComicImage = ({ src, alt, pageNumber, totalPages, onImageLoad, onImageError }) => {
    const [imageError, setImageError] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(null);
    const imgRef = useRef(null);

    const handleImageError = () => {
        setImageError(true);
        if (onImageError) onImageError();
    };

    const handleImageLoad = (e) => {
        if (imgRef.current) {
            const { naturalWidth, naturalHeight } = imgRef.current;
            if (naturalWidth > 0 && naturalHeight > 0) {
                setAspectRatio(naturalWidth / naturalHeight);
            }
        }
        if (onImageLoad) onImageLoad();
    };

    const placeholderHeight = useMemo(() => {
        if (imageError) return '100px';
        if (aspectRatio) {
            const containerWidth = Math.min(800, window.innerWidth - 40);
            return `${containerWidth / aspectRatio}px`;
        }
        return '800px';
    }, [imageError, aspectRatio]);


    return (
        <div className="comic-page-container">
            <div
                className="comic-page-image-container"
                height={placeholderHeight}
                offset={400}
                once
                placeholder={
                    <div className="comic-page-placeholder" style={{ minHeight: placeholderHeight }}>
                        <div className="spinner-eff-small"></div>
                        <span className="placeholder-text">Đang tải trang {pageNumber}/{totalPages}...</span>
                    </div>
                }
            >
                {imageError ? (
                    <div className="comic-page-error">
                        <i className="fas fa-exclamation-triangle icon-before"></i>
                        Lỗi tải trang {pageNumber}.
                        <button onClick={() => window.location.reload()} className="btn-retry-load">Thử lại</button>
                    </div>
                ) : (
                    <img
                        ref={imgRef}
                        src={src.startsWith('http') ? src : `${process.env.REACT_APP_API_URL}/uploads/${src}`}
                        alt={alt}
                        className="comic-page-image"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        loading="lazy"
                    />
                )}
            </div>
        </div>
    );
};


const ComicReaderPage = () => {
    const { comicSlug, chapterId } = useParams();
    const navigate = useNavigate();

    const [comicInfo, setComicInfo] = useState(null);
    const [chapterDetails, setChapterDetails] = useState(null);
    const [allChapters, setAllChapters] = useState([]);
    const [currentPageImages, setCurrentPageImages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const readerControlsRef = useRef(null);
    const [showControls, setShowControls] = useState(true);
    const [isUserInteractingWithControls, setIsUserInteractingWithControls] = useState(false);
    let hideControlsTimeout = useRef(null);

    const [totalImages, setTotalImages] = useState(0);
    const [loadedImagesCount, setLoadedImagesCount] = useState(0);

    useEffect(() => {
        const fetchChapterData = async () => {
            if (!chapterId) { setError("Không có ID chương."); setIsLoading(false); return; }
            setIsLoading(true); setError(null); NProgress.start();
            setLoadedImagesCount(0);
            setTotalImages(0);

            try {
                const chapterRes = await axios.get(`/api/chapters/${chapterId}/pages`);
                if (chapterRes.data?.success && chapterRes.data.chapter) {
                    const currentChapter = chapterRes.data.chapter;
                    setChapterDetails(currentChapter);
                    const sortedPages = (currentChapter.pages || []).sort((a, b) => a.pageNumber - b.pageNumber);
                    setCurrentPageImages(sortedPages);
                    setTotalImages(sortedPages.length);
                    setComicInfo(currentChapter.comic);

                    if (currentChapter.comic?.id) {
                        const allChaptersRes = await axios.get(`/api/comics/${currentChapter.comic.id}/chapters`, {
                            params: { limit: 1000, sortBy: 'order', sortOrder: 'ASC' }
                        });
                        if (allChaptersRes.data?.success) {
                            setAllChapters((allChaptersRes.data.chapters || []).sort((a, b) => a.order - b.order));
                        }
                    }
                    window.scrollTo({ top: 0, behavior: 'auto' });

                } else {
                    throw new Error(chapterRes.data?.message || "Không thể tải dữ liệu chương.");
                }
            } catch (err) {
                handleApiError(err, `tải chương ID ${chapterId}`);
                if (err.response?.status === 404) navigate("/404", { replace: true });
            } finally {
                setIsLoading(false); NProgress.done();
            }
        };
        fetchChapterData();
    }, [chapterId, navigate, handleApiError]);

    const handleImageLoaded = useCallback(() => {
        setLoadedImagesCount(prev => prev + 1);
    }, []);

    const handleImageLoadError = useCallback(() => {
        // Có thể không cần tăng loadedImagesCount nếu ảnh lỗi
        // setLoadedImagesCount(prev => prev + 1); // Hoặc vẫn tăng để progress bar chạy hết
    }, []);

    const loadingProgress = totalImages > 0 ? (loadedImagesCount / totalImages) * 100 : 0;

    // Xử lý tự động ẩn/hiện thanh điều khiển
    const resetHideControlsTimeout = useCallback(() => {
        setShowControls(true);
        clearTimeout(hideControlsTimeout.current);
        hideControlsTimeout.current = setTimeout(() => {
            if (!isUserInteractingWithControls && readerControlsRef.current && !readerControlsRef.current.matches(':hover')) {
                setShowControls(false);
            }
        }, 3000);
    }, [isUserInteractingWithControls]);

    useEffect(() => {
        window.addEventListener('mousemove', resetHideControlsTimeout);
        window.addEventListener('scroll', resetHideControlsTimeout);
        window.addEventListener('click', resetHideControlsTimeout);

        const controlsElement = readerControlsRef.current;
        const enterControls = () => setIsUserInteractingWithControls(true);
        const leaveControls = () => {
            setIsUserInteractingWithControls(false);
            resetHideControlsTimeout();
        };

        if (controlsElement) {
            controlsElement.addEventListener('mouseenter', enterControls);
            controlsElement.addEventListener('mouseleave', leaveControls);
        }

        return () => {
            window.removeEventListener('mousemove', resetHideControlsTimeout);
            window.removeEventListener('scroll', resetHideControlsTimeout);
            window.removeEventListener('click', resetHideControlsTimeout);
            if (controlsElement) {
                controlsElement.removeEventListener('mouseenter', enterControls);
                controlsElement.removeEventListener('mouseleave', leaveControls);
            }
            clearTimeout(hideControlsTimeout.current);
        };
    }, [resetHideControlsTimeout]);

    const navigateChapter = (targetChapterId) => {
        if (targetChapterId && comicInfo?.slug) {
            NProgress.start();
            navigate(`/truyen/${comicInfo.slug}/chap/${targetChapterId}`);
        }
    };

    const currentChapterIndex = useMemo(() => {
        return allChapters.findIndex(chap => String(chap.id) === String(chapterId));
    }, [allChapters, chapterId]);

    const prevChapter = useMemo(() => (currentChapterIndex > 0 ? allChapters[currentChapterIndex - 1] : null), [allChapters, currentChapterIndex]);
    const nextChapter = useMemo(() => (currentChapterIndex < allChapters.length - 1 ? allChapters[currentChapterIndex + 1] : null), [allChapters, currentChapterIndex]);

    useEffect(() => {
        if (comicInfo && chapterDetails) {
            document.title = `${comicInfo.title} - Chương ${chapterDetails.chapterNumber} | WWAN Film`;
        } else if (!isLoading) {
            document.title = 'Đọc truyện | WWAN Film';
        }
    }, [comicInfo, chapterDetails, isLoading]);


    if (isLoading && currentPageImages.length === 0) {
        return <div className="page-loader"><div className="spinner-eff"></div><p>Đang tải chương truyện...</p></div>;
    }
    if (error && !chapterDetails) {
        return (
            <div className="container text-center py-5">
                <div className="alert-custom alert-danger">{error}</div>
                <Link to={comicInfo?.slug ? `/truyen/${comicInfo.slug}` : "/truyen-tranh"} className="btn-custom btn-primary-custom mt-3">
                    {comicInfo ? "Quay lại trang truyện" : "Về danh sách truyện"}
                </Link>
            </div>
        );
    }
    if (!chapterDetails || (currentPageImages.length === 0 && !isLoading)) {
        return (
            <div className="container text-center py-5">
                <div className="alert-custom alert-info">Không có dữ liệu trang cho chương này hoặc chương không tồn tại.</div>
                <Link to={comicInfo?.slug ? `/truyen/${comicInfo.slug}` : "/truyen-tranh"} className="btn-custom btn-primary-custom mt-3">
                    {comicInfo ? "Quay lại trang truyện" : "Về danh sách truyện"}
                </Link>
            </div>
        );
    }

    return (
        <div className="comic-reader-page" onMouseMove={resetHideControlsTimeout} onClick={(e) => {
            if (readerControlsRef.current && !readerControlsRef.current.contains(e.target)) {
                setShowControls(prev => !prev);
            }
        }}>
                <div ref={readerControlsRef} className={`reader-controls ${showControls ? "visible" : "hidden"}`}>
                    <div className="controls-breadcrumb breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item">
                                <Link to="/truyen-tranh" className="breadcrumb-link">
                                    Truyện tranh
                                </Link>
                            </li>
                            <li className="breadcrumb-item">
                                <Link to={`/truyen/${comicInfo.slug}`} className="breadcrumb-link comic-title-breadcrumb" title={comicInfo.title}>
                                    {comicInfo.title}
                                </Link>
                            </li>
                            <li className="breadcrumb-item active" aria-current="page">
                                <span className="breadcrumb-link">
                                    Chương {chapterDetails.chapterNumber}
                                </span>
                            </li>
                        </ol>
                        
                    </div>
                    <div className="controls-navigation">
                        <button onClick={() => prevChapter && navigateChapter(prevChapter.id)} disabled={!prevChapter || isLoading} className="btn-nav prev" title={prevChapter ? `Chương ${prevChapter.chapterNumber}` : "Đầu truyện"}>
                            <i className="fas fa-chevron-left"></i> <span className="btn-nav-text">Trước</span>
                        </button>
                        <select className="chapter-select" value={chapterId} onChange={(e) => navigateChapter(e.target.value)} disabled={isLoading || allChapters.length <= 1} title="Chọn chương">
                            {allChapters.map(chap => (
                                <option key={chap.id} value={chap.id}>
                                    Chap {chap.chapterNumber}
                                </option>
                            ))}
                        </select>
                        <button onClick={() => nextChapter && navigateChapter(nextChapter.id)} disabled={!nextChapter || isLoading} className="btn-nav next" title={nextChapter ? `Chương ${nextChapter.chapterNumber}` : "Cuối truyện"}>
                            <span className="btn-nav-text">Sau</span> <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div className="controls-actions">
                        <Link to={`/truyen/${comicInfo.slug}`} className="btn-nav back-to-comic" title="Danh sách chương">
                            <i className="fas fa-list-ul"></i>
                        </Link>
                        <button className="btn-nav settings-reader" title="Tùy chỉnh đọc truyện"><i className="fas fa-cog"></i></button>
                    </div>
                </div>

            <div className="comic-content-area">
                {currentPageImages.map((page, index) => (
                    <ComicImage
                        key={page.id || `page-image-${index}`}
                        src={page.imageUrl}
                        alt={`Trang ${page.pageNumber}`}
                        pageNumber={page.pageNumber}
                        totalPages={totalImages}
                        onImageLoad={handleImageLoaded}
                        onImageError={handleImageLoadError}
                    />
                ))}
            </div>

            {currentPageImages.length > 0 && !isLoading && (
                <div className={`reader-bottom-navigation ${showControls ? 'controls-visible' : ''}`}>
                    <button onClick={() => prevChapter && navigateChapter(prevChapter.id)} disabled={!prevChapter} className="btn-nav-bottom">
                        <i className="fas fa-arrow-left me-1"></i> Chương trước
                    </button>
                    <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn-nav-bottom" title="Lên đầu trang">
                        <i className="fas fa-arrow-up"></i>
                    </button>
                    <button onClick={() => nextChapter && navigateChapter(nextChapter.id)} disabled={!nextChapter} className="btn-nav-bottom">
                        Chương sau <i className="fas fa-arrow-right ms-1"></i>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ComicReaderPage;