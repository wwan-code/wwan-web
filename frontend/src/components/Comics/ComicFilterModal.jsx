import { useState, useEffect, useRef } from 'react';
import api from '@services/api';
import { useSearchParams } from 'react-router-dom';
import '@assets/scss/components/_comic-filter-modal.scss';

const ComicFilterModal = ({ onClose, activeFilters }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const modalRef = useRef(null);
    const [filterOptions, setFilterOptions] = useState({
        genres: [],
        countries: [],
        statuses: [
            { id: '', title: 'Tất cả trạng thái' },
            { id: 'ongoing', title: 'Đang tiến hành' },
            { id: 'completed', title: 'Hoàn thành' },
            { id: 'paused', title: 'Tạm dừng' },
            { id: 'dropped', title: 'Đã drop' },
        ],
        years: [],
        sortOptions: [
            { id: 'lastChapterUpdatedAt_desc', title: 'Mới cập nhật chương' },
            { id: 'views_desc', title: 'Xem nhiều nhất' },
            { id: 'createdAt_desc', title: 'Truyện mới đăng' },
            { id: 'year_desc', title: 'Năm (Mới nhất)' },
            { id: 'year_asc', title: 'Năm (Cũ nhất)' },
            { id: 'title_asc', title: 'Tên A-Z' },
            { id: 'title_desc', title: 'Tên Z-A' },
        ]
    });
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [currentFilters, setCurrentFilters] = useState({
        genre: activeFilters.genre || '',
        country: activeFilters.country || '',
        status: activeFilters.status || '',
        year: activeFilters.year || '',
        sort: activeFilters.sort || 'lastChapterUpdatedAt_desc'
    });

    // Load filter options
    useEffect(() => {
        const fetchOptions = async () => {
            setIsLoadingOptions(true);
            try {
                const response = await api.get('/comics/filters');
                if (response.data.success) {
                    const data = response.data.data;
                    const currentYear = new Date().getFullYear();
                    const years = [{ id: '', title: 'Tất cả năm' }];
                    for (let y = currentYear; y >= 2000; y--) {
                        years.push({ id: String(y), title: String(y) });
                    }
                    setFilterOptions(prev => ({
                        ...prev,
                        genres: [{ id: '', title: 'Tất cả thể loại' }, ...(data.genres || [])],
                        countries: [{ id: '', title: 'Tất cả quốc gia' }, ...(data.countries || [])],
                        years: years,
                    }));
                }
            } catch (error) {
                console.error("Lỗi tải tùy chọn bộ lọc:", error);
            } finally {
                setIsLoadingOptions(false);
            }
        };
        fetchOptions();
    }, []);

    // Handle click outside modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        const newParams = {};
        
        // Preserve search query
        if (activeFilters.q) newParams.q = activeFilters.q;
        
        // Add filters
        if (currentFilters.genre) newParams.genre = currentFilters.genre;
        if (currentFilters.country) newParams.country = currentFilters.country;
        if (currentFilters.status && currentFilters.status !== 'all' && currentFilters.status !== '') {
            newParams.status = currentFilters.status;
        }
        if (currentFilters.year) newParams.year = currentFilters.year;
        if (currentFilters.sort) newParams.sort = currentFilters.sort;
        
        newParams.page = '1';
        
        setSearchParams(newParams, { replace: true });
        onClose();
    };

    const handleResetFilters = () => {
        const defaultSort = 'lastChapterUpdatedAt_desc';
        setCurrentFilters({
            genre: '', 
            country: '', 
            status: '', 
            year: '', 
            sort: defaultSort
        });
        
        const newParams = { sort: defaultSort, page: '1' };
        if (activeFilters.q) newParams.q = activeFilters.q;
        
        setSearchParams(newParams, { replace: true });
        onClose();
    };

    const getActiveFilterCount = () => {
        return Object.keys(currentFilters).filter(key => 
            key !== 'sort' && currentFilters[key] && currentFilters[key] !== 'all'
        ).length;
    };

    return (
        <div className="manga-filter-modal-overlay">
            <div className="manga-filter-modal" ref={modalRef}>
                <div className="manga-filter-modal__header">
                    <h3 className="manga-filter-modal__title">
                        <i className="fas fa-filter"></i>
                        Bộ lọc truyện
                    </h3>
                    <button 
                        className="manga-filter-modal__close"
                        onClick={onClose}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="manga-filter-modal__body">
                    {isLoadingOptions ? (
                        <div className="manga-filter-loading">
                            <div className="manga-loading__spinner"></div>
                            <p>Đang tải bộ lọc...</p>
                        </div>
                    ) : (
                        <div className="manga-filter-grid">
                            {/* Sort */}
                            <div className="manga-filter-group">
                                <label className="manga-filter-group__label">
                                    <i className="fas fa-sort"></i>
                                    Sắp xếp
                                </label>
                                <select 
                                    name="sort" 
                                    value={currentFilters.sort} 
                                    onChange={handleInputChange}
                                    className="manga-filter-select"
                                >
                                    {filterOptions.sortOptions.map(option => (
                                        <option key={option.id} value={option.id}>
                                            {option.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Status */}
                            <div className="manga-filter-group">
                                <label className="manga-filter-group__label">
                                    <i className="fas fa-info-circle"></i>
                                    Trạng thái
                                </label>
                                <select 
                                    name="status" 
                                    value={currentFilters.status} 
                                    onChange={handleInputChange}
                                    className="manga-filter-select"
                                >
                                    {filterOptions.statuses.map(status => (
                                        <option key={status.id} value={status.id}>
                                            {status.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Genre */}
                            <div className="manga-filter-group">
                                <label className="manga-filter-group__label">
                                    <i className="fas fa-tags"></i>
                                    Thể loại
                                </label>
                                <select 
                                    name="genre" 
                                    value={currentFilters.genre} 
                                    onChange={handleInputChange}
                                    className="manga-filter-select"
                                >
                                    {filterOptions.genres.map(genre => (
                                        <option key={genre.id || 'all-genres'} value={genre.id}>
                                            {genre.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Country */}
                            <div className="manga-filter-group">
                                <label className="manga-filter-group__label">
                                    <i className="fas fa-globe"></i>
                                    Quốc gia
                                </label>
                                <select 
                                    name="country" 
                                    value={currentFilters.country} 
                                    onChange={handleInputChange}
                                    className="manga-filter-select"
                                >
                                    {filterOptions.countries.map(country => (
                                        <option key={country.id || 'all-countries'} value={country.id}>
                                            {country.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Year */}
                            <div className="manga-filter-group">
                                <label className="manga-filter-group__label">
                                    <i className="fas fa-calendar"></i>
                                    Năm phát hành
                                </label>
                                <select 
                                    name="year" 
                                    value={currentFilters.year} 
                                    onChange={handleInputChange}
                                    className="manga-filter-select"
                                >
                                    {filterOptions.years.map(year => (
                                        <option key={year.id} value={year.id}>
                                            {year.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="manga-filter-modal__footer">
                    <div className="manga-filter-modal__info">
                        {getActiveFilterCount() > 0 && (
                            <span className="manga-filter-count">
                                {getActiveFilterCount()} bộ lọc đang áp dụng
                            </span>
                        )}
                    </div>
                    <div className="manga-filter-modal__actions">
                        <button 
                            type="button" 
                            onClick={handleResetFilters}
                            className="manga-filter-btn manga-filter-btn--reset"
                            disabled={isLoadingOptions}
                        >
                            <i className="fas fa-undo"></i>
                            Xóa bộ lọc
                        </button>
                        <button 
                            type="button"
                            onClick={handleApplyFilters}
                            className="manga-filter-btn manga-filter-btn--apply"
                            disabled={isLoadingOptions}
                        >
                            <i className="fas fa-check"></i>
                            Áp dụng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComicFilterModal;