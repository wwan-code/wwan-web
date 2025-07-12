import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "@assets/scss/components/_header-banner.scss";

const HeaderBanner = ({ searchValue = "", onSearchChange }) => {
    const bannerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Parallax effect
    useEffect(() => {
        const handleScroll = () => {
            const banner = bannerRef.current;
            if (!banner) return;
            
            const scrolled = window.pageYOffset;
            const parallax = banner.querySelector('.manga-hero__background');
            if (parallax) {
                parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fade-in animation on load
    useEffect(() => {
        const banner = bannerRef.current;
        if (banner) {
            banner.classList.add('manga-hero--loaded');
        }
    }, []);

    // Ngăn submit form gây reload trang
    const handleSearchSubmit = (e) => {
        e.preventDefault();
    };

    // Xử lý thay đổi input
    const handleInputChange = (e) => {
        if (onSearchChange) {
            onSearchChange(e.target.value);
        }
    };

    return (
        <section className="manga-hero" ref={bannerRef}>
            <div className="manga-hero__background">
                <div className="manga-hero__bg-image"></div>
                <div className="manga-hero__overlay"></div>
            </div>

            <div className="manga-hero__content">
                <div className="manga-hero__text">
                    <h1 className="manga-hero__title">
                        <span className="manga-hero__title-main">Thế Giới Manga</span>
                        <span className="manga-hero__title-sub">Khám phá những câu chuyện tuyệt vời</span>
                    </h1>
                    <p className="manga-hero__description">
                        Đọc manga, manhwa, manhua miễn phí với chất lượng cao. 
                        Cập nhật nhanh nhất, đầy đủ nhất.
                    </p>
                </div>

                <div className="manga-hero__actions">
                    <form className="manga-hero__search" onSubmit={handleSearchSubmit}>
                        <div className="manga-search-box">
                            <input
                                type="text"
                                className="manga-search-box__input"
                                placeholder="Tìm kiếm manga, manhwa, manhua..."
                                ref={searchInputRef}
                                value={searchValue}
                                onChange={handleInputChange}
                                autoComplete="off"
                            />
                            <button className="manga-search-box__button" type="submit">
                                <i className="fas fa-search"></i>
                            </button>
                        </div>
                    </form>

                    <div className="manga-hero__quick-links">
                        <Link to="/truyen-tranh?sort=views_desc" className="manga-quick-link manga-quick-link--hot">
                            <i className="fas fa-fire"></i>
                            <span>Truyện Hot</span>
                        </Link>
                        <Link to="/truyen-tranh?sort=createdAt_desc" className="manga-quick-link manga-quick-link--new">
                            <i className="fas fa-plus-circle"></i>
                            <span>Mới Đăng</span>
                        </Link>
                        <Link to="/truyen-tranh?sort=lastChapterUpdatedAt_desc" className="manga-quick-link manga-quick-link--updated">
                            <i className="fas fa-clock"></i>
                            <span>Mới Cập Nhật</span>
                        </Link>
                    </div>

                    <Link to="/truyen-tranh" className="manga-hero__cta-button">
                        <span>Đọc Ngay</span>
                        <i className="fas fa-arrow-right"></i>
                    </Link>
                </div>
            </div>

            <div className="manga-hero__decorations">
                <div className="manga-decoration manga-decoration--1"></div>
                <div className="manga-decoration manga-decoration--2"></div>
                <div className="manga-decoration manga-decoration--3"></div>
            </div>
        </section>
    );
};

export default HeaderBanner;