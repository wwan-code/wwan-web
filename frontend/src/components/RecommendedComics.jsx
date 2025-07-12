import { useState, useEffect, useRef } from 'react';
import api from '@services/api';

const RecommendedComics = ({ title = "Đề xuất truyện tranh cho bạn" }) => {
    const [comics, setComics] = useState([]);
    const [featuredIdx, setFeaturedIdx] = useState(0);
    const [featuredOpacity, setFeaturedOpacity] = useState(1);
    const [buttonActive, setButtonActive] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const comicSectionRef = useRef(null);

    // Load comics data
    useEffect(() => {
        api.get('/comic-recommendations?limit=7')
            .then(res => {
                if (res.data && res.data.comics && res.data.comics.length > 0) {
                    setComics(res.data.comics);
                    setFeaturedIdx(0);
                    // Set loaded state after a small delay for animation sequencing
                    setTimeout(() => setIsLoaded(true), 300);
                }
            })
            .catch(() => setComics([]));
    }, []);

    // Animation on scroll into view
    useEffect(() => {
        if (!comicSectionRef.current) return;
        
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setIsLoaded(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.2 }
        );
        
        observer.observe(comicSectionRef.current);
        return () => observer.disconnect();
    }, [comics.length]);

    // Thumbnail click handler with enhanced animation
    const handleThumbnailClick = (idx) => {
        if (idx === featuredIdx) return;
        
        setFeaturedOpacity(0.4);
        setTimeout(() => {
            setFeaturedIdx(idx);
            setTimeout(() => setFeaturedOpacity(1), 50);
        }, 300);
    };

    // Button click effect with enhanced animation
    const handleReadClick = () => {
        setButtonActive(true);
        setTimeout(() => {
            setButtonActive(false);
            if (comics[featuredIdx]?.slug) {
                window.location.href = `/truyen/${comics[featuredIdx].slug}`;
            }
        }, 300);
    };

    // Auto rotate featured comic with smooth transition
    useEffect(() => {
        if (!comics.length || !isLoaded) return;

        const timer = setTimeout(() => {
            setFeaturedOpacity(0.4);
            setTimeout(() => {
                setFeaturedIdx((prevIdx) => (prevIdx + 1) % comics.length);
                setTimeout(() => setFeaturedOpacity(1), 50);
            }, 300);
        }, 8000);

        return () => clearTimeout(timer);
    }, [featuredIdx, comics, isLoaded]);

    if (!comics.length) return null;

    const featuredComic = comics[featuredIdx];

    return (
        <section className="recommended-comics" ref={comicSectionRef}>
            <div className="container">
                <div className="recommended-comics__header">
                    <h3>{title}</h3>
                    <p>Khám phá những truyện tranh phù hợp với sở thích của bạn</p>
                </div>
                <div className="recommendation">
                    <div className="recommendation__wrapper">
                        <section className="recommendation__content">
                            <h2 className="recommendation__title">{featuredComic.title}</h2>

                            <div className="tags">
                                {featuredComic.genres?.slice(0, 3).map(g => (
                                    <span className="tags__item" key={g.id}>{g.title}</span>
                                ))}
                            </div>

                            <p className="recommendation__description">
                                {featuredComic.description?.slice(0, 150)?.trim() || "Không có mô tả cho truyện tranh này."}{featuredComic.description?.length > 150 ? "..." : ""}
                            </p>

                            <div className="thumbnails">
                                {comics.map((comic, idx) => (
                                    <div
                                        className={`thumbnails__item ${idx === featuredIdx ? 'active' : ''}`}
                                        key={comic.id}
                                        onClick={() => handleThumbnailClick(idx)}
                                        style={{ animationDelay: `${0.1 + idx * 0.1}s` }}
                                    >
                                        <img
                                            className="thumbnails__image"
                                            src={comic.coverImage
                                                ? (comic.coverImage.startsWith('http')
                                                    ? comic.coverImage
                                                    : `${process.env.REACT_APP_API_URL_IMAGE}/${comic.coverImage}`)
                                                : "https://via.placeholder.com/70x93?text=No+Image"}
                                            alt={comic.title}
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <aside className="recommendation__media">
                            <div className="featured-media">
                                <img
                                    className="featured-media__image"
                                    src={featuredComic.bannerImage
                                        ? (featuredComic.bannerImage.startsWith('http')
                                            ? featuredComic.bannerImage
                                            : `${process.env.REACT_APP_API_URL_IMAGE}/${featuredComic.bannerImage}`)
                                        : "https://via.placeholder.com/600x338?text=No+Image"}
                                    alt={featuredComic.title}
                                    style={{ opacity: featuredOpacity, transition: 'opacity 0.4s ease' }}
                                />
                                <button
                                    className={`featured-media__button${buttonActive ? ' featured-media__button--active' : ''}`}
                                    onClick={handleReadClick}
                                >
                                    Đi đến Đọc
                                </button>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default RecommendedComics;