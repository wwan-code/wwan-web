import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '@services/api';
import { handleApiError } from '@utils/handleApiError';

const TopAnimeRankings = () => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [hoveredAnime, setHoveredAnime] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, side: 'right' });
    const tooltipRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                setLoading(true);
                const response = await api.get('/anime/top-rankings');
                if (response.data?.success) {
                    setRankings(response.data.rankings || []);
                } else {
                    throw new Error(response.data?.message || 'Không thể tải dữ liệu xếp hạng anime.');
                }
            } catch (err) {
                setError(handleApiError(err, "dữ liệu xếp hạng anime"));
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, []);

    useEffect(() => {
        // Auto-rotate featured anime every 10 seconds
        const interval = setInterval(() => {
            if (rankings.length > 0) {
                setActiveIndex((prevIndex) => (prevIndex + 1) % rankings.length);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [rankings.length]);

    const handleAnimeHover = (anime, event) => {
        const itemRect = event.currentTarget.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, right: window.innerWidth };
        const viewportWidth = window.innerWidth;
        
        // Determine if tooltip should appear on left or right
        let side = 'right';
        let x = itemRect.right + 10; // Default position on right side with 10px gap
        
        // If there's not enough space on the right, show on the left
        if (x + 280 > viewportWidth) { // Assuming tooltip width is 280px
            side = 'left';
            x = itemRect.left - 290; // Position on left side with 10px gap
        }
        
        // If there's not enough space on the left either, center it above or below
        if (x < 0) {
            side = 'top';
            x = Math.max(10, itemRect.left + (itemRect.width / 2) - 140); // Center tooltip, min 10px from left edge
        }
        
        // Calculate y position (centered vertically to the hovered item)
        const y = itemRect.top + (itemRect.height / 2);
        
        setTooltipPosition({ x, y, side });
        setHoveredAnime(anime);
    };

    const handleAnimeLeave = () => {
        setHoveredAnime(null);
    };

    if (error || rankings.length === 0) {
        return null;
    }

    const featuredAnime = rankings[activeIndex];

    return (
        <div className="top-anime" ref={containerRef}>
            <div className="top-anime__inner">
                <div className="top-anime__header">
                    <h2>
                        <span className="top-anime__title sci-fi-title">Top 10</span> 
                        <span className="top-anime__subtitle sci-fi-subtitle">Anime Rankings</span>
                    </h2>
                    <div className="top-anime__decoration sci-fi-decoration">
                        <div className="top-anime__decoration-line sci-fi-line"></div>
                        <div className="top-anime__decoration-glow sci-fi-glow"></div>
                    </div>
                </div>

                <div className="top-anime__content">
                    <div className="featured-anime">
                        <div className="featured-anime-image">
                            <picture className="featured-anime-image-picture">
                                <source srcSet={process.env.REACT_APP_API_URL_IMAGE + "/" + featuredAnime.bannerURL} type="image/webp" />
                                <img className="featured-anime-image-img" src={process.env.REACT_APP_API_URL_IMAGE + "/" + featuredAnime.bannerURL} alt={featuredAnime.title} loading="lazy" />
                            </picture>
                            <div className="rank-badge">#{featuredAnime?.rank}</div>
                            <div className="featured-anime-overlay"></div>
                        </div>
                        <div className="featured-anime-info">
                            <h3 className="featured-anime-title">{featuredAnime?.title}</h3>
                            <div className="featured-anime-meta">
                                <span className="featured-anime-year">{featuredAnime?.year}</span>
                                <span className="featured-anime-rating">
                                    <i className="fas fa-star"></i> {featuredAnime?.averageRating}
                                </span>
                                <span className="featured-anime-views">
                                    <i className="fas fa-eye"></i> {featuredAnime?.views?.toLocaleString()}
                                </span>
                            </div>
                            <div className="featured-anime-description">
                                {featuredAnime?.description?.length > 120 
                                    ? `${featuredAnime.description.substring(0, 120)}...` 
                                    : featuredAnime?.description}
                            </div>
                            <Link to={`/album/${featuredAnime?.slug}`} className="sci-fi-button">
                                Xem chi tiết <i className="fas fa-chevron-right"></i>
                            </Link>
                        </div>
                    </div>

                    <div className="anime-ranking-list">
                        <div className="anime-ranking-scroll">
                            {rankings.map((anime, index) => (
                                <div 
                                    key={anime.id}
                                    className={`anime-ranking-item${activeIndex === index ? ' active' : ''}`}
                                    onClick={() => setActiveIndex(index)}
                                    onMouseEnter={(e) => handleAnimeHover(anime, e)}
                                    onMouseLeave={handleAnimeLeave}
                                >
                                    <div className="anime-ranking-number">#{anime.rank}</div>
                                    <div className="anime-ranking-image">
                                        <img src={process.env.REACT_APP_API_URL_IMAGE + "/" + anime.posterURL} alt={anime.title} />
                                    </div>
                                    <div className="anime-ranking-details">
                                        <h4>{anime.title}</h4>
                                        <div className="anime-ranking-stats">
                                            <span><i className="fas fa-star"></i> {anime.averageRating}</span>
                                            <span><i className="fas fa-eye"></i> {anime.views.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Detailed Tooltip */}
            {hoveredAnime && (
                <div 
                    className={`anime-tooltip tooltip-${tooltipPosition.side}`}
                    ref={tooltipRef}
                    style={{ 
                        left: `${tooltipPosition.x}px`, 
                        top: `${tooltipPosition.y}px`,
                        transform: `translate(0, -50%)`
                    }}
                >
                    <div className="anime-tooltip-content">
                        <div className="anime-tooltip-header">
                            <h4 className="anime-tooltip-title">{hoveredAnime.title}</h4>
                            <div className="anime-tooltip-rank">#{hoveredAnime.rank}</div>
                        </div>
                        
                        <div className="anime-tooltip-info">
                            <div className="anime-tooltip-meta">
                                <span><i className="fas fa-calendar"></i> {hoveredAnime.year}</span>
                                <span><i className="fas fa-star"></i> {hoveredAnime.averageRating}</span>
                                <span><i className="fas fa-eye"></i> {hoveredAnime.views.toLocaleString()}</span>
                            </div>
                            
                            {hoveredAnime.genres && hoveredAnime.genres.length > 0 && (
                                <div className="anime-tooltip-genres">
                                    {hoveredAnime.genres.map(genre => (
                                        <span key={genre.id} className="anime-tooltip-genre-tag">
                                            {genre.title}
                                        </span>
                                    ))}
                                </div>
                            )}
                            
                            {hoveredAnime.description && (
                                <div className="anime-tooltip-description">
                                    {hoveredAnime.description.length > 150 
                                        ? `${hoveredAnime.description.substring(0, 150)}...` 
                                        : hoveredAnime.description}
                                </div>
                            )}
                            
                            <Link to={`/album/${hoveredAnime.slug}`} className="anime-tooltip-link">
                                Xem chi tiết <i className="fas fa-arrow-right"></i>
                            </Link>
                        </div>
                    </div>
                    <div className="anime-tooltip-arrow"></div>
                </div>
            )}
        </div>
    );
};

export default TopAnimeRankings;