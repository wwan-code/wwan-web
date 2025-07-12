import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import NProgress from 'nprogress';

// Components
import LazyImage from "@components/LazyImage";
import ComicComments from "@components/Comics/ComicComments";
import Modal from "@components/CustomModal";

// Services & Utils
import api from '@services/api';
import authHeader from '@services/auth-header';
import { handleApiError } from '@utils/handleApiError';

// Hooks
import useUIPreferences from "@hooks/useUIPreferences";

// Styles
import '@assets/scss/pages/_comic-reader-page.scss';

// Constants
const HIDE_CONTROLS_DELAY = 3000;
const DEFAULT_PLACEHOLDER_HEIGHT = '800px';
const ERROR_PLACEHOLDER_HEIGHT = '100px';

// ===== SUBCOMPONENTS =====

const ComicImage = ({ src, alt, pageNumber, totalPages, onImageLoad, onImageError }) => {
    const [imageError, setImageError] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(null);
    const imgRef = useRef(null);
    const { preferences } = useUIPreferences();

    const handleImageError = useCallback(() => {
        setImageError(true);
        onImageError?.();
    }, [onImageError]);

    const handleImageLoad = useCallback((e) => {
        if (imgRef.current) {
            const { naturalWidth, naturalHeight } = imgRef.current;
            if (naturalWidth > 0 && naturalHeight > 0) {
                setAspectRatio(naturalWidth / naturalHeight);
            }
        }
        onImageLoad?.();
    }, [onImageLoad]);

    const placeholderHeight = useMemo(() => {
        if (imageError) return ERROR_PLACEHOLDER_HEIGHT;
        if (aspectRatio && imgRef.current) {
            const { naturalHeight } = imgRef.current;
            return `${naturalHeight}px`;
        }
        return DEFAULT_PLACEHOLDER_HEIGHT;
    }, [imageError, aspectRatio]);

    const imageSrc = useMemo(() => {
        return src.startsWith('http') ? src : `${process.env.REACT_APP_API_URL_IMAGE}/${src}`;
    }, [src]);

    if (imageError) {
        return (
            <div className="comic-page-container">
                <div className="comic-page-image-container">
                    <div className="comic-page-error">
                        <i className="fas fa-exclamation-triangle icon-before"></i>
                        Lỗi tải trang {pageNumber}.
                        <button 
                            onClick={() => window.location.reload()} 
                            className="btn-retry-load"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="comic-page-container">
            <div className="comic-page-image-container">
                <LazyImage
                    ref={imgRef}
                    src={imageSrc}
                    alt={alt}
                    className="comic-page-image"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ 
                        minHeight: preferences.readerMode === 'scroll' ? placeholderHeight : 'auto'
                    }}
                />
            </div>
        </div>
    );
};

const ReaderControls = ({ 
    comicInfo, 
    chapterDetails, 
    allChapters, 
    chapterId, 
    prevChapter, 
    nextChapter, 
    isLoading, 
    onNavigateChapter 
}) => (
    <nav className="reader-controls">
        <div className="controls-breadcrumb">
            <ol className="breadcrumb">
                <li className="breadcrumb-item">
                    <Link to="/truyen-tranh" className="breadcrumb-link">
                        Truyện tranh
                    </Link>
                </li>
                <li className="breadcrumb-item">
                    <Link 
                        to={`/truyen/${comicInfo.slug}`} 
                        className="breadcrumb-link comic-title-breadcrumb" 
                        title={comicInfo.title}
                    >
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
            <button 
                onClick={() => prevChapter && onNavigateChapter(prevChapter.id)} 
                disabled={!prevChapter || isLoading} 
                className="btn-nav prev" 
                title={prevChapter ? `Chương ${prevChapter.chapterNumber}` : "Đầu truyện"}
            >
                <i className="fas fa-chevron-left"></i>
                <span className="btn-nav-text">Trước</span>
            </button>
            
            <select 
                className="chapter-select" 
                value={chapterId} 
                onChange={(e) => onNavigateChapter(e.target.value)} 
                disabled={isLoading || allChapters.length <= 1} 
                title="Chọn chương"
            >
                {allChapters.map(chap => (
                    <option key={chap.id} value={chap.id}>
                        Chap {chap.chapterNumber}
                    </option>
                ))}
            </select>
            
            <button 
                onClick={() => nextChapter && onNavigateChapter(nextChapter.id)} 
                disabled={!nextChapter || isLoading} 
                className="btn-nav next" 
                title={nextChapter ? `Chương ${nextChapter.chapterNumber}` : "Cuối truyện"}
            >
                <span className="btn-nav-text">Sau</span>
                <i className="fas fa-chevron-right"></i>
            </button>
        </div>
    </nav>
);

const LoadingProgressBar = ({ loadingProgress }) => (
    <div className="reader-loading-progress-bar">
        <div className="progress-bar-inner" style={{ width: `${loadingProgress}%` }}>
            {Math.round(loadingProgress)}%
        </div>
    </div>
);

const FlipModeReader = ({ 
    currentPageImages, 
    flipPageIndex, 
    setFlipPageIndex, 
    totalImages, 
    onImageLoad, 
    onImageError 
}) => (
    <section className="comic-page-section" aria-label={`Trang ${currentPageImages[flipPageIndex]?.pageNumber || 1}`}>
        <ComicImage
            src={currentPageImages[flipPageIndex]?.imageUrl}
            alt={`Trang ${currentPageImages[flipPageIndex]?.pageNumber}`}
            pageNumber={currentPageImages[flipPageIndex]?.pageNumber}
            totalPages={totalImages}
            onImageLoad={onImageLoad}
            onImageError={onImageError}
        />
        <div className="flip-controls">
            <button
                className="btn-flip"
                onClick={() => setFlipPageIndex(i => Math.max(i - 1, 0))}
                disabled={flipPageIndex === 0}
            >
                <i className="fas fa-chevron-left"></i>
            </button>
            <span className="flip-page-info">
                Trang {currentPageImages[flipPageIndex]?.pageNumber || 1}/{totalImages}
            </span>
            <button
                className="btn-flip"
                onClick={() => setFlipPageIndex(i => Math.min(i + 1, totalImages - 1))}
                disabled={flipPageIndex === totalImages - 1}
            >
                <i className="fas fa-chevron-right"></i>
            </button>
        </div>
    </section>
);

const ScrollModeReader = ({ currentPageImages, onImageLoad, onImageError }) => (
    <>
        {currentPageImages.map((page, index) => (
            <section
                key={page.id || `page-image-${index}`}
                className="comic-page-section"
                aria-label={`Trang ${page.pageNumber}`}
            >
                <ComicImage
                    src={page.imageUrl}
                    alt={`Trang ${page.pageNumber}`}
                    pageNumber={page.pageNumber}
                    totalPages={currentPageImages.length}
                    onImageLoad={onImageLoad}
                    onImageError={onImageError}
                />
            </section>
        ))}
    </>
);

const BottomNavigation = ({ 
    showControls, 
    prevChapter, 
    nextChapter, 
    chapterId, 
    allChapters, 
    comicInfo, 
    isLoading, 
    onNavigateChapter, 
    onShowReaderSettings 
}) => (
    <footer className={`reader-bottom-navigation ${showControls ? 'controls-visible' : ''}`}>
        <div className="bottom-nav-controls">
            <button 
                onClick={() => prevChapter && onNavigateChapter(prevChapter.id)} 
                disabled={!prevChapter} 
                className="btn-nav-bottom"
            >
                <i className="fas fa-arrow-left me-1"></i> Chương trước
            </button>
            
            <select 
                className="chapter-select" 
                value={chapterId} 
                onChange={(e) => onNavigateChapter(e.target.value)} 
                disabled={isLoading || allChapters.length <= 1} 
                title="Chọn chương"
            >
                {allChapters.map(chap => (
                    <option key={chap.id} value={chap.id}>
                        Chap {chap.chapterNumber}
                    </option>
                ))}
            </select>
            
            <button 
                onClick={() => nextChapter && onNavigateChapter(nextChapter.id)} 
                disabled={!nextChapter} 
                className="btn-nav-bottom"
            >
                Chương sau <i className="fas fa-arrow-right ms-1"></i>
            </button>
            
            <Link 
                to={`/truyen/${comicInfo.slug}`} 
                className="btn-nav-bottom" 
                title="Danh sách chương"
            >
                <i className="fas fa-list-ul"></i>
            </Link>
            
            <button
                className="btn-nav-bottom"
                title="Tùy chỉnh đọc truyện"
                onClick={onShowReaderSettings}
            >
                <i className="fas fa-cog"></i>
            </button>
            
            <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                className="btn-nav-bottom" 
                title="Lên đầu trang"
            >
                <i className="fas fa-arrow-up"></i>
            </button>
        </div>
    </footer>
);

const ReaderSettingsModal = ({ 
    show, 
    onHide, 
    preferences, 
    setSinglePreference, 
    ACCENT_COLORS 
}) => (
    <Modal
        show={show}
        onHide={onHide}
        title="Tùy chỉnh đọc truyện"
        modalId="reader-settings-modal"
        footer={
            <button className="btn btn-primary" onClick={onHide}>
                Đóng
            </button>
        }
    >
        <div className="reader-settings-panel">
            <div className="mb-3">
                <label className="form-label">Kiểu đọc</label>
                <select
                    className="form-select"
                    value={preferences.readerMode || 'scroll'}
                    onChange={e => setSinglePreference('readerMode', e.target.value)}
                >
                    <option value="scroll">Cuộn xuống</option>
                    <option value="flip">Lật trang</option>
                </select>
            </div>
            
            <div className="mb-3">
                <label className="form-label">Chế độ nền</label>
                <select
                    className="form-select"
                    value={preferences.theme}
                    onChange={e => setSinglePreference('theme', e.target.value)}
                >
                    <option value="light">Sáng</option>
                    <option value="dark">Tối</option>
                    <option value="system">Theo hệ thống</option>
                </select>
            </div>
            
            <div className="mb-3">
                <label className="form-label">Màu nhấn</label>
                <div className="d-flex flex-wrap gap-2">
                    {ACCENT_COLORS.map(color => (
                        <button
                            key={color.value}
                            type="button"
                            className={`color-dot ${preferences.accentColor === color.value ? 'active' : ''}`}
                            style={{ 
                                background: color.value, 
                                width: 28, 
                                height: 28, 
                                borderRadius: '6px' 
                            }}
                            onClick={() => setSinglePreference('accentColor', color.value)}
                            title={color.name}
                        />
                    ))}
                </div>
            </div>
            
            <div className="mb-3">
                <label className="form-label">Cỡ chữ</label>
                <select
                    className="form-select"
                    value={preferences.fontSize}
                    onChange={e => setSinglePreference('fontSize', e.target.value)}
                >
                    <option value="small">Nhỏ</option>
                    <option value="medium">Trung bình</option>
                    <option value="large">Lớn</option>
                </select>
            </div>
            
            <div className="mb-3">
                <label className="form-label">Bo góc</label>
                <select
                    className="form-select"
                    value={preferences.borderRadius}
                    onChange={e => setSinglePreference('borderRadius', e.target.value)}
                >
                    <option value="none">Không bo</option>
                    <option value="small">Nhỏ</option>
                    <option value="medium">Trung bình</option>
                    <option value="large">Lớn</option>
                </select>
            </div>
        </div>
    </Modal>
);

// ===== CUSTOM HOOKS =====

const useChapterData = (chapterId, navigate) => {
    const [state, setState] = useState({
        comicInfo: null,
        chapterDetails: null,
        allChapters: [],
        currentPageImages: [],
        isLoading: true,
        error: null,
        totalImages: 0,
        loadedImagesCount: 0,
    });

    const fetchChapterData = useCallback(async () => {
        if (!chapterId) {
            setState(prev => ({ 
                ...prev, 
                error: "Không có ID chương.", 
                isLoading: false 
            }));
            return;
        }

        setState(prev => ({ 
            ...prev, 
            isLoading: true, 
            error: null, 
            loadedImagesCount: 0, 
            totalImages: 0 
        }));
        
        NProgress.start();

        try {
            const chapterRes = await api.get(`/api/chapters/${chapterId}/pages`, {
                headers: authHeader()
            });

            if (chapterRes.data?.success && chapterRes.data.chapter) {
                const currentChapter = chapterRes.data.chapter;
                const sortedPages = (currentChapter.pages || []).sort((a, b) => a.pageNumber - b.pageNumber);

                setState(prev => ({
                    ...prev,
                    chapterDetails: currentChapter,
                    currentPageImages: sortedPages,
                    totalImages: sortedPages.length,
                    comicInfo: currentChapter.comic,
                }));

                // Fetch all chapters
                if (currentChapter.comic?.id) {
                    const allChaptersRes = await api.get(`/api/comics/${currentChapter.comic.id}/chapters`, {
                        params: { limit: 1000, sortBy: 'order', sortOrder: 'ASC' }
                    });
                    
                    if (allChaptersRes.data?.success) {
                        const sortedChapters = (allChaptersRes.data.chapters || []).sort((a, b) => a.order - b.order);
                        setState(prev => ({ ...prev, allChapters: sortedChapters }));
                    }
                }

                window.scrollTo({ top: 0, behavior: 'auto' });
            } else {
                throw new Error(chapterRes.data?.message || "Không thể tải dữ liệu chương.");
            }
        } catch (err) {
            handleApiError(err, `tải chương ID ${chapterId}`);
            setState(prev => ({ ...prev, error: err.message }));
            
            if (err.response?.status === 404) {
                navigate("/404", { replace: true });
            }
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
            NProgress.done();
        }
    }, [chapterId, navigate]);

    useEffect(() => {
        fetchChapterData();
    }, [fetchChapterData]);

    const handleImageLoaded = useCallback(() => {
        setState(prev => ({ ...prev, loadedImagesCount: prev.loadedImagesCount + 1 }));
    }, []);

    const handleImageLoadError = useCallback(() => {
        // Handle image load error if needed
    }, []);

    return {
        ...state,
        handleImageLoaded,
        handleImageLoadError,
    };
};

const useControlsVisibility = () => {
    const [showControls, setShowControls] = useState(true);
    const [isUserInteractingWithControls, setIsUserInteractingWithControls] = useState(false);
    const hideControlsTimeout = useRef(null);
    const readerControlsRef = useRef(null);

    const resetHideControlsTimeout = useCallback(() => {
        setShowControls(true);
        clearTimeout(hideControlsTimeout.current);
        hideControlsTimeout.current = setTimeout(() => {
            if (!isUserInteractingWithControls && 
                readerControlsRef.current && 
                !readerControlsRef.current.matches(':hover')) {
                setShowControls(false);
            }
        }, HIDE_CONTROLS_DELAY);
    }, [isUserInteractingWithControls]);

    useEffect(() => {
        const handleUserActivity = () => resetHideControlsTimeout();
        
        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);
        window.addEventListener('click', handleUserActivity);

        const controlsElement = readerControlsRef.current;
        const handleMouseEnter = () => setIsUserInteractingWithControls(true);
        const handleMouseLeave = () => {
            setIsUserInteractingWithControls(false);
            resetHideControlsTimeout();
        };

        if (controlsElement) {
            controlsElement.addEventListener('mouseenter', handleMouseEnter);
            controlsElement.addEventListener('mouseleave', handleMouseLeave);
        }

        return () => {
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
            window.removeEventListener('click', handleUserActivity);
            
            if (controlsElement) {
                controlsElement.removeEventListener('mouseenter', handleMouseEnter);
                controlsElement.removeEventListener('mouseleave', handleMouseLeave);
            }
            
            clearTimeout(hideControlsTimeout.current);
        };
    }, [resetHideControlsTimeout]);

    return {
        showControls,
        setShowControls,
        readerControlsRef,
        resetHideControlsTimeout,
    };
};

// ===== MAIN COMPONENT =====

const ComicReaderPage = () => {
    const { comicSlug, chapterId } = useParams();
    const navigate = useNavigate();
    const { preferences, setSinglePreference, ACCENT_COLORS } = useUIPreferences();
    
    // Custom hooks
    const {
        comicInfo,
        chapterDetails,
        allChapters,
        currentPageImages,
        isLoading,
        error,
        totalImages,
        loadedImagesCount,
        handleImageLoaded,
        handleImageLoadError,
    } = useChapterData(chapterId, navigate);

    const {
        showControls,
        setShowControls,
        readerControlsRef,
        resetHideControlsTimeout,
    } = useControlsVisibility();

    // Local state
    const [flipPageIndex, setFlipPageIndex] = useState(0);
    const [showReaderSettings, setShowReaderSettings] = useState(false);

    // Reset flip page index when chapter changes
    useEffect(() => {
        setFlipPageIndex(0);
    }, [chapterId]);

    // Update document title
    useEffect(() => {
        if (comicInfo && chapterDetails) {
            document.title = `${comicInfo.title} - Chương ${chapterDetails.chapterNumber} | WWAN Film`;
        } else if (!isLoading) {
            document.title = 'Đọc truyện | WWAN Film';
        }
    }, [comicInfo, chapterDetails, isLoading]);

    // Navigation handlers
    const navigateChapter = useCallback((targetChapterId) => {
        if (targetChapterId && comicInfo?.slug) {
            NProgress.start();
            navigate(`/truyen/${comicInfo.slug}/chap/${targetChapterId}`);
        }
    }, [comicInfo?.slug, navigate]);

    const handleContentAreaClick = useCallback((e) => {
        if (readerControlsRef.current && !readerControlsRef.current.contains(e.target)) {
            setShowControls(prev => !prev);
        }
    }, []);

    // Computed values
    const currentChapterIndex = useMemo(() => {
        return allChapters.findIndex(chap => String(chap.id) === String(chapterId));
    }, [allChapters, chapterId]);

    const prevChapter = useMemo(() => {
        return currentChapterIndex > 0 ? allChapters[currentChapterIndex - 1] : null;
    }, [allChapters, currentChapterIndex]);

    const nextChapter = useMemo(() => {
        return currentChapterIndex < allChapters.length - 1 ? allChapters[currentChapterIndex + 1] : null;
    }, [allChapters, currentChapterIndex]);

    const loadingProgress = useMemo(() => {
        return totalImages > 0 ? (loadedImagesCount / totalImages) * 100 : 0;
    }, [loadedImagesCount, totalImages]);

    // Loading state
    if (isLoading && currentPageImages.length === 0) {
        return (
            <div className="page-loader">
                <div className="spinner-eff"></div>
                <p>Đang tải chương truyện...</p>
            </div>
        );
    }

    // Error state
    if (error && !chapterDetails) {
        return (
            <div className="container text-center py-5">
                <div className="alert-custom alert-danger">{error}</div>
                <Link 
                    to={comicInfo?.slug ? `/truyen/${comicInfo.slug}` : "/truyen-tranh"} 
                    className="btn-custom btn-primary-custom mt-3"
                >
                    {comicInfo ? "Quay lại trang truyện" : "Về danh sách truyện"}
                </Link>
            </div>
        );
    }

    // No data state
    if (!chapterDetails || (currentPageImages.length === 0 && !isLoading)) {
        return (
            <div className="container text-center py-5">
                <div className="alert-custom alert-info">
                    Không có dữ liệu trang cho chương này hoặc chương không tồn tại.
                </div>
                <Link 
                    to={comicInfo?.slug ? `/truyen/${comicInfo.slug}` : "/truyen-tranh"} 
                    className="btn-custom btn-primary-custom mt-3"
                >
                    {comicInfo ? "Quay lại trang truyện" : "Về danh sách truyện"}
                </Link>
            </div>
        );
    }

    return (
        <>
            <div 
                className="comic-reader-page" 
                onMouseMove={resetHideControlsTimeout} 
                onClick={handleContentAreaClick}
            >
                <ReaderControls
                    comicInfo={comicInfo}
                    chapterDetails={chapterDetails}
                    allChapters={allChapters}
                    chapterId={chapterId}
                    prevChapter={prevChapter}
                    nextChapter={nextChapter}
                    isLoading={isLoading}
                    onNavigateChapter={navigateChapter}
                />

                {isLoading && (
                    <LoadingProgressBar loadingProgress={loadingProgress} />
                )}

                <main 
                    className={`comic-content-area ${
                        preferences.readerMode === 'flip' ? 'reader-flip-mode' : 'reader-scroll-mode'
                    }`} 
                    tabIndex={0}
                >
                    {preferences.readerMode === 'flip' ? (
                        <FlipModeReader
                            currentPageImages={currentPageImages}
                            flipPageIndex={flipPageIndex}
                            setFlipPageIndex={setFlipPageIndex}
                            totalImages={totalImages}
                            onImageLoad={handleImageLoaded}
                            onImageError={handleImageLoadError}
                        />
                    ) : (
                        <ScrollModeReader
                            currentPageImages={currentPageImages}
                            onImageLoad={handleImageLoaded}
                            onImageError={handleImageLoadError}
                        />
                    )}
                </main>

                {currentPageImages.length > 0 && !isLoading && (
                    <BottomNavigation
                        showControls={showControls}
                        prevChapter={prevChapter}
                        nextChapter={nextChapter}
                        chapterId={chapterId}
                        allChapters={allChapters}
                        comicInfo={comicInfo}
                        isLoading={isLoading}
                        onNavigateChapter={navigateChapter}
                        onShowReaderSettings={() => setShowReaderSettings(true)}
                    />
                )}

                <aside className="comic-comments-area" aria-label="Bình luận chương truyện">
                    <ComicComments comic={chapterDetails} contentType="chapter" />
                </aside>
            </div>

            <ReaderSettingsModal
                show={showReaderSettings}
                onHide={() => setShowReaderSettings(false)}
                preferences={preferences}
                setSinglePreference={setSinglePreference}
                ACCENT_COLORS={ACCENT_COLORS}
            />
        </>
    );
};

export default ComicReaderPage;