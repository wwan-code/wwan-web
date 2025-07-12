import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '@services/api';
import "@assets/scss/pages/_comic-ranking.scss";

// Subcomponent for individual comic card
const ComicCard = ({ comic, rank }) => {
  const getRankColor = (rank) => {
    if (rank === 1) return 'comic-ranking__rank--first';
    if (rank === 2) return 'comic-ranking__rank--second';
    if (rank === 3) return 'comic-ranking__rank--third';
    return '';
  };

  return (
    <div className="comic-ranking__item" style={{ '--animation-delay': `${(rank - 1) * 0.1}s` }}>
      <div className={`comic-ranking__rank ${getRankColor(rank)}`}>
        {rank < 10 ? `0${rank}` : rank}
      </div>
      <div className="comic-ranking__cover">
        <div className="comic-ranking__cover-glow"></div>
        <img 
          src={comic.coverImage ? 
            (comic.coverImage.startsWith('http') ? 
              comic.coverImage : 
              `${process.env.REACT_APP_API_URL_IMAGE}/${comic.coverImage}`) : 
            'https://via.placeholder.com/80x100?text=No+Image'
          } 
          alt={comic.title}
          className="comic-ranking__cover-image"
          loading="lazy"
        />
      </div>
      <div className="comic-ranking__info">
        <Link to={`/truyen/${comic.slug}`} className="comic-ranking__title-text">
          {comic.title}
        </Link>
        <p className="comic-ranking__views">
          <span className="comic-ranking__views-icon">✦</span>
          {comic.views.toLocaleString()} lượt xem
        </p>
        {comic.genres && comic.genres.length > 0 && (
          <span className="comic-ranking__genre">
            {comic.genres.slice(0, 2).map(g => g.title).join(', ')}
          </span>
        )}
        <p className="comic-ranking__chapters">
          {comic.chapters && comic.chapters.length > 0
            ? `Chapter ${comic.chapters[0].chapterNumber}`
            : ''}
        </p>
      </div>
      {comic.trending && (
        <div className="comic-ranking__trending">
          {comic.trending === 'up' && (
            <span className="comic-ranking__trending-up">▲</span>
          )}
          {comic.trending === 'down' && (
            <span className="comic-ranking__trending-down">▼</span>
          )}
        </div>
      )}
      <div className="comic-ranking__stars"></div>
    </div>
  );
};

// Subcomponent for category navigation
const CategoryNav = ({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div className="comic-ranking__sidebar">
      <div className="comic-ranking__header">
        <span className="comic-ranking__title">Danh sách truyện tranh</span>
        <span className="comic-ranking__subtitle">Khám phá vũ trụ manga đầy màu sắc với những bảng xếp hạng mới nhất</span>
      </div>
      <nav className="comic-ranking__nav">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`comic-ranking__nav-item ${
              activeCategory === category.id ? 'comic-ranking__nav-item--active' : ''
            } ${category.color || ''}`}
            onClick={() => onCategoryChange(category.id)}
          >
            <span className="comic-ranking__nav-icon">{category.icon || '✦'}</span>
            <span className="comic-ranking__nav-text">{category.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

// Subcomponent for comic list display
const ComicRankingList = ({ comics, loading }) => {
  if (loading) {
    return <div className="comic-ranking__loading">
      <div className="comic-ranking__loading-stars"></div>
      <p>Đang tải dữ liệu từ vũ trụ manga...</p>
    </div>;
  }
  
  if (comics.length === 0) {
    return <div className="comic-ranking__empty">Không tìm thấy truyện nào trong vũ trụ này.</div>;
  }
  
  return (
    <div className="comic-ranking__grid">
      {comics.map((comic, idx) => (
        <ComicCard key={comic.id} comic={comic} rank={idx + 1} />
      ))}
    </div>
  );
};

// Enhanced category definitions with icons
const categories = [
  { id: 'new', name: 'Truyện mới nhất', icon: '⭐', color: 'text-blue-500', params: {} },
  { id: 'ranking', name: 'Bảng xếp hạng', icon: '🏆', color: 'text-blue-500', params: { sortBy: 'views' } },
  { id: 'chinese', name: 'Truyện Trung Quốc', icon: '🐉', params: { country: 'trung-quoc' } },
  { id: 'japanese', name: 'Truyện Nhật Bản', icon: '🌸', params: { country: 'nhat-ban' } },
  { id: 'korean', name: 'Truyện Hàn Quốc', icon: '🌟', params: { country: 'han-quoc' } },
  { id: 'complete', name: 'Đã hoàn thành', icon: '✅', params: { status: 'completed' } },
];

// Main component
const ComicRankingInterface = () => {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(false);

  // Memoized function to get API parameters
  const getApiParams = useCallback((categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.params : {};
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback((categoryId) => {
    setActiveCategory(categoryId);
  }, []);

  // Fetch comics when category changes
  useEffect(() => {
    const fetchComics = async () => {
      setLoading(true);
      try {
        const params = getApiParams(activeCategory);
        const res = await api.get('/comics', { params: { ...params, limit: 20 } });
        
        // Add small delay for smoother animation effect
        setTimeout(() => {
          setComics(res.data.comics || []);
          setLoading(false);
        }, 300);
      } catch (err) {
        console.error('Error fetching comics:', err);
        setComics([]);
        setLoading(false);
      }
    };
    fetchComics();
  }, [activeCategory, getApiParams]);

  return (
    <section className="comic-ranking">
      <div className="comic-ranking__stars-bg"></div>
      <div className="comic-ranking__planet-1"></div>
      <div className="comic-ranking__planet-2"></div>
      
      <div className="comic-ranking__container">
        <CategoryNav 
          categories={categories} 
          activeCategory={activeCategory} 
          onCategoryChange={handleCategoryChange} 
        />
        
        <div className="comic-ranking__main">
          <ComicRankingList comics={comics} loading={loading} />
        </div>
      </div>
    </section>
  );
};

export default ComicRankingInterface;