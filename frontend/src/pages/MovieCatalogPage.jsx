import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import { FiFilter, FiChevronDown } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { MdSort } from "react-icons/md";
import SingleFilm from "@components/SingleFilm";

const MovieCatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  // State variables
  const [movies, setMovies] = useState([]);
  const [filters, setFilters] = useState({
    genres: [],
    countries: [],
    categories: [],
    years: []
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 24
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Refs for tracking previous values
  const previousFiltersRef = useRef({});
  const abortControllerRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  
  // Memoized selected filters để tránh re-render không cần thiết
  const selectedFilters = useMemo(() => ({
    genre: searchParams.get("genre") || "",
    region: searchParams.get("region") || "",
    year: searchParams.get("year") || "",
    season: searchParams.get("season") || "",
    order: searchParams.get("order") || "Mới nhất"
  }), [searchParams]);

  // Memoized current page
  const currentPage = useMemo(() => {
    return parseInt(searchParams.get("page")) || 1;
  }, [searchParams]);

  // Memoized filter comparison để kiểm tra có thay đổi thực sự không
  const hasFiltersChanged = useMemo(() => {
    const current = JSON.stringify(selectedFilters);
    const previous = JSON.stringify(previousFiltersRef.current);
    return current !== previous;
  }, [selectedFilters]);

  // Debounced filter change để tránh gọi API liên tục
  const debouncedFilterChange = useCallback(
    debounce((newFilters) => {
      previousFiltersRef.current = { ...newFilters };
    }, 300),
    []
  );

  // Fetch filter options - chỉ gọi một lần khi component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchFilters = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/filters`);
        if (isMounted) {
          setFilters(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching filters:", error);
        }
      }
    };
    
    fetchFilters();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Optimized fetch movies với abort controller và debounce
  const fetchMovies = useCallback(async (filtersToUse, pageToUse) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear previous timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Set loading state
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/filter?page=${pageToUse}`,
        filtersToUse,
        {
          signal: abortControllerRef.current.signal,
          timeout: 10000 // 10 second timeout
        }
      );
      
      setMovies(response.data.movies);
      setPagination(response.data.pagination);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error("Error fetching movies:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect để fetch movies khi filters hoặc page thay đổi
  useEffect(() => {
    // Kiểm tra xem có thay đổi thực sự không
    if (!hasFiltersChanged && currentPage === pagination.currentPage) {
      return;
    }
    
    // Debounce API call
    fetchTimeoutRef.current = setTimeout(() => {
      fetchMovies(selectedFilters, currentPage);
      previousFiltersRef.current = { ...selectedFilters };
    }, 300);
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [selectedFilters, currentPage, fetchMovies, hasFiltersChanged, pagination.currentPage]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Memoized handle filter change
  const handleFilterChange = useCallback((type, value) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (value) {
      newParams.set(type, value);
    } else {
      newParams.delete(type);
    }
    
    // Reset to first page when filters change (except for page and order changes)
    if (type !== 'page' && type !== 'order') {
      newParams.delete("page");
    }
    
    setSearchParams(newParams);
    debouncedFilterChange({ ...selectedFilters, [type]: value });
  }, [searchParams, setSearchParams, selectedFilters, debouncedFilterChange]);

  // Memoized handle page change
  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === currentPage) {
      return;
    }
    
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage);
    setSearchParams(newParams);
  }, [searchParams, setSearchParams, pagination.totalPages, currentPage]);

  // Memoized clear filters
  const clearFilters = useCallback(() => {
    setSearchParams({});
    previousFiltersRef.current = {};
  }, [setSearchParams]);

  // Optimized toggle filters với useCallback
  const toggleFilters = useCallback(() => {
    setShowFilters(prev => {
      const newState = !prev;
      // Prevent body scrolling when filters are shown
      document.body.style.overflow = newState ? 'hidden' : '';
      return newState;
    });
  }, []);

  // Optimized click outside handler
  useEffect(() => {
    if (!showFilters) return;
    
    const handleClickOutside = (e) => {
      const filterElement = document.querySelector('.catalog-filters');
      const toggleButton = document.querySelector('.filter-toggle-btn');
      
      if (filterElement && !filterElement.contains(e.target) && 
          toggleButton && !toggleButton.contains(e.target)) {
        setShowFilters(false);
        document.body.style.overflow = '';
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [showFilters]);

  // Memoized pagination items để tránh re-calculate không cần thiết
  const paginationItems = useMemo(() => {
    const items = [];
    const totalPages = pagination.totalPages;
    
    if (totalPages <= 1) return items;
    
    // Always show first page
    items.push(
      <button 
        key="first" 
        className={`pagination-item ${currentPage === 1 ? "active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>
    );
    
    // Show ellipsis if needed
    if (currentPage > 3) {
      items.push(
        <span key="ellipsis1" className="pagination-ellipsis">...</span>
      );
    }
    
    // Show pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue;
      items.push(
        <button 
          key={i} 
          className={`pagination-item ${currentPage === i ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }
    
    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(
        <span key="ellipsis2" className="pagination-ellipsis">...</span>
      );
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      items.push(
        <button 
          key="last" 
          className={`pagination-item ${currentPage === totalPages ? "active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }
    
    return items;
  }, [currentPage, pagination.totalPages, handlePageChange]);

  // Memoized active filters display
  const activeFiltersDisplay = useMemo(() => {
    const activeFilters = [];
    
    if (selectedFilters.genre && filters.genres?.length > 0) {
      const genre = filters.genres.find(g => g.id.toString() === selectedFilters.genre);
      if (genre) {
        activeFilters.push(
          <div key="genre" className="active-filter">
            <span>Thể loại: {genre.title}</span>
            <button onClick={() => handleFilterChange("genre", "")}>×</button>
          </div>
        );
      }
    }
    
    if (selectedFilters.region && filters.countries?.length > 0) {
      const country = filters.countries.find(c => c.id.toString() === selectedFilters.region);
      if (country) {
        activeFilters.push(
          <div key="region" className="active-filter">
            <span>Quốc gia: {country.title}</span>
            <button onClick={() => handleFilterChange("region", "")}>×</button>
          </div>
        );
      }
    }
    
    if (selectedFilters.year) {
      activeFilters.push(
        <div key="year" className="active-filter">
          <span>Năm: {selectedFilters.year}</span>
          <button onClick={() => handleFilterChange("year", "")}>×</button>
        </div>
      );
    }
    
    if (selectedFilters.season) {
      activeFilters.push(
        <div key="season" className="active-filter">
          <span>Mùa: {selectedFilters.season}</span>
          <button onClick={() => handleFilterChange("season", "")}>×</button>
        </div>
      );
    }
    
    return activeFilters;
  }, [selectedFilters, filters.genres, filters.countries, handleFilterChange]);

  // Memoized filter options để tránh re-render filter chips
  const genreOptions = useMemo(() => 
    filters.genres?.map(genre => (
      <div 
        key={genre.id} 
        className={`filter-chip ${selectedFilters.genre === genre.id.toString() ? "active" : ""}`}
        onClick={() => handleFilterChange("genre", genre.id.toString())}
      >
        {genre.title}
      </div>
    )), [filters.genres, selectedFilters.genre, handleFilterChange]);

  const countryOptions = useMemo(() => 
    filters.countries?.map(country => (
      <div 
        key={country.id} 
        className={`filter-chip ${selectedFilters.region === country.id.toString() ? "active" : ""}`}
        onClick={() => handleFilterChange("region", country.id.toString())}
      >
        {country.title}
      </div>
    )), [filters.countries, selectedFilters.region, handleFilterChange]);

  const yearOptions = useMemo(() => 
    filters.years?.map(year => (
      <div 
        key={year} 
        className={`filter-chip ${selectedFilters.year === year.toString() ? "active" : ""}`}
        onClick={() => handleFilterChange("year", year.toString())}
      >
        {year}
      </div>
    )), [filters.years, selectedFilters.year, handleFilterChange]);

  const seasonOptions = useMemo(() => 
    ["Xuân", "Hạ", "Thu", "Đông"].map(season => (
      <div 
        key={season} 
        className={`filter-chip ${selectedFilters.season === season ? "active" : ""}`}
        onClick={() => handleFilterChange("season", season)}
      >
        {season}
      </div>
    )), [selectedFilters.season, handleFilterChange]);

  return (
    <div className="movie-catalog-page">
      {/* Filter overlay for mobile */}
      <div className={`filter-overlay ${showFilters ? 'show' : ''}`} onClick={toggleFilters}></div>
      
      <div className="catalog-header">
        <div className="container">
          <h1 className="catalog-title">Thư Viện Phim</h1>
          <p className="catalog-description">
            Khám phá kho tàng phim đa dạng thể loại, từ bom tấn Hollywood đến những tác phẩm độc lập đặc sắc
          </p>
          <div className="mobile-filter-toggle">
            <button className="filter-toggle-btn" onClick={toggleFilters}>
              <FiFilter /> Lọc
            </button>
            <div className="filter-sort-dropdown">
              <div className="dropdown-header">
                <MdSort /> Sắp xếp
                <FiChevronDown />
              </div>
              <div className="dropdown-menu">
                <button 
                  className={selectedFilters.order === "Mới nhất" ? "active" : ""}
                  onClick={() => handleFilterChange("order", "Mới nhất")}
                >
                  Mới nhất
                </button>
                <button 
                  className={selectedFilters.order === "Hot" ? "active" : ""}
                  onClick={() => handleFilterChange("order", "Hot")}
                >
                  Phổ biến nhất
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container">
        <div className="catalog-content">
          {/* Filter sidebar */}
          <aside className={`catalog-filters ${showFilters ? 'show' : ''}`}>
            <div className="filter-header">
              <h2>Bộ lọc</h2>
              <button className="close-filters" onClick={toggleFilters}>
                <IoClose />
              </button>
            </div>
            
            <div className="filter-section">
              <h3>Sắp xếp</h3>
              <div className="filter-options">
                <div 
                  className={`filter-chip ${selectedFilters.order === "Mới nhất" ? "active" : ""}`}
                  onClick={() => handleFilterChange("order", "Mới nhất")}
                >
                  Mới nhất
                </div>
                <div 
                  className={`filter-chip ${selectedFilters.order === "Hot" ? "active" : ""}`}
                  onClick={() => handleFilterChange("order", "Hot")}
                >
                  Phổ biến nhất
                </div>
              </div>
            </div>

            <div className="filter-section">
              <h3>Thể loại</h3>
              <div className="filter-options scrollable">
                {genreOptions}
              </div>
            </div>
            
            <div className="filter-section">
              <h3>Quốc gia</h3>
              <div className="filter-options scrollable">
                {countryOptions}
              </div>
            </div>
            
            <div className="filter-section">
              <h3>Năm</h3>
              <div className="filter-options scrollable">
                {yearOptions}
              </div>
            </div>
            
            <div className="filter-section">
              <h3>Mùa</h3>
              <div className="filter-options">
                {seasonOptions}
              </div>
            </div>
            
          </aside>
          
          {/* Movie grid */}
          <div className="catalog-movies">
            <div className="active-filters">
              {activeFiltersDisplay}
              {activeFiltersDisplay.length > 0 && (
                <button className="clear-all" onClick={clearFilters}>Xóa tất cả</button>
              )}
            </div>
            
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải...</p>
              </div>
            ) : movies.length > 0 ? (
              <>
                <div className="movies-grid">
                  {movies.map((movie, index) => (
                    <SingleFilm key={movie.id} movie={movie}/>
                  ))}
                </div>
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="catalog-pagination">
                    <button 
                      className="pagination-arrow" 
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      ←
                    </button>
                    <div className="pagination-numbers">
                      {paginationItems}
                    </div>
                    <button 
                      className="pagination-arrow" 
                      disabled={currentPage === pagination.totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="no-results">
                <h3>Không tìm thấy phim nào phù hợp</h3>
                <p>Vui lòng thử lại với bộ lọc khác</p>
                <button className="reset-btn" onClick={clearFilters}>Đặt lại bộ lọc</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default MovieCatalogPage;