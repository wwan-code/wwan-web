import logoW from '@assets/images/wwan-logo-text.png';
import { useEffect, useState, useCallback } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import useDropdown from '@hooks/useDropdown';
import classNames from '@utils/classNames';
import { useAppContext } from '@contexts/AppContext';
import Search from '@components/Search';
import MobileSidebar from '@components/MobileSidebar';
import SearchPopup from '@components/SearchPopup';
import CustomOverlayTrigger from '@components/CustomTooltip/CustomOverlayTrigger';
import UserDropdown from '@components/Layout/UserDropdown';
import NotificationDropdown from '@components/Layout/NotificationDropdown';
import { FiLogIn } from "react-icons/fi";
import { FaBars } from "react-icons/fa";

const Header = () => {
    const { currentUser, isLoggedIn, logOut } = useAppContext();
    const location = useLocation();

    const { openDropdown, toggleDropdown, dropdownRefCallback } = useDropdown();
    const [isHeaderFixed, setIsHeaderFixed] = useState(false);
    const [showSearchPopup, setShowSearchPopup] = useState(false);
    const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(window.innerWidth < 992);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [currentStatusFilter, setCurrentStatusFilter] = useState('all');

    const navLinks = [
        { to: "/", label: "Trang chủ", exact: true },
        { to: "/muc-luc", label: "Mục Lục" },
        { to: "/anime", label: "Anime" },
        { to: "/thu-vien-phim", label: "Phim" },
        { to: "/truyen-tranh", label: "Truyện Tranh" },
        { to: "/bang-xep-hang", label: "BXH" },
        { to: "/minigame/ne-chuong-ngai-vat", label: "MiniGame" }
    ];

    const handleResize = useCallback(() => {
        setIsMobileSearchVisible(window.innerWidth < 992);
    }, []);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    useEffect(() => {
        const handleScroll = () => {
            setIsHeaderFixed(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isOnComicReaderPage = location.pathname.includes('/truyen/');

    const handleFilterChange = (newStatus) => {
        if (newStatus !== currentStatusFilter) {
            setCurrentStatusFilter(newStatus);
        }
    };

    return (
        <>
            <header className={classNames("header", { "header-fixed": isHeaderFixed && !isOnComicReaderPage })}>
                <div className="header-container">
                    <div className="header-area">
                        <div className="header-left">
                            <div className="header-logo">
                                <Link to={'/'}>
                                    <img src={logoW} alt="logo" />
                                </Link>
                            </div>
                            <div className='header-toggle-mobile'>
                                <button
                                    className="navbar-toggler-custom"
                                    type="button"
                                    onClick={() => setShowMobileMenu(true)}
                                    aria-label="Mở menu"
                                    aria-expanded={showMobileMenu}
                                >
                                    <FaBars />
                                </button>
                            </div>
                        </div>

                        <div className="header-menu">
                            <nav className="navbar navbar-expand">
                                <ul className='navbar-nav'>
                                    <li className='nav-item'>
                                        <CustomOverlayTrigger
                                            placement="bottom"
                                            tooltipId="tooltip-home"
                                            tooltip={<>Trang chủ</>}
                                        >
                                            <NavLink className={({ isActive, isPending }) =>
                                                classNames("nav-link", { "active": isActive, "pending": isPending })
                                            } to={'/'}>
                                                <svg className='nav-icon-svg' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                                    <path d="M2 12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274C22 8.77128 22 9.91549 22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039Z" stroke="currentColor" strokeWidth="1.5" />
                                                    <path d="M15 18H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            </NavLink>
                                        </CustomOverlayTrigger>
                                    </li>
                                    <li className='nav-item'>
                                        <CustomOverlayTrigger
                                            placement="bottom"
                                            tooltipId="tooltip-anime"
                                            tooltip={<>Danh sách anime</>}
                                        >
                                            <NavLink className={({ isActive, isPending }) =>
                                                classNames("nav-link", { "active": isActive, "pending": isPending })
                                            } to={'/anime'}>
                                                <svg className='nav-icon-svg' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                                    <path d="M20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                                    <path d="M17.8486 6.19085C19.8605 5.81929 21.3391 5.98001 21.8291 6.76327C22.8403 8.37947 19.2594 12.0342 13.8309 14.9264C8.40242 17.8185 3.18203 18.8529 2.17085 17.2367C1.63758 16.3844 2.38148 14.9651 4 13.3897" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                                </svg>
                                            </NavLink>
                                        </CustomOverlayTrigger>
                                    </li>
                                    <li className='nav-item'>
                                        <CustomOverlayTrigger
                                            placement="bottom"
                                            tooltipId="tooltip-catalog"
                                            tooltip={<>Thư viện phim</>}
                                        >
                                            <NavLink className={({ isActive, isPending }) =>
                                                classNames("nav-link", { "active": isActive, "pending": isPending })
                                            } to={'/thu-vien-phim'}>
                                                <svg className='nav-icon-svg' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                                    <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" stroke="currentColor" strokeWidth="1.5" />
                                                    <path d="M21 5.5V18.5M17.5 5.5V18.5M12 5.5V18.5M6.5 5.5V18.5M3 5.5V18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path d="M2 9.5H22M2 14.5H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            </NavLink>
                                        </CustomOverlayTrigger>
                                    </li>
                                    <li className='nav-item'>
                                        <CustomOverlayTrigger
                                            placement="bottom"
                                            tooltipId='tooltip-thinh-hanh'
                                            tooltip={<>Thịnh hành</>}
                                        >
                                            <NavLink className={({ isActive, isPending }) =>
                                                classNames("nav-link", { "active": isActive, "pending": isPending })
                                            } to={'/trending'}>
                                                <svg className='nav-icon-svg' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 21C16.4183 21 20 17.6439 20 13.504C20 9.76257 17.9654 6.83811 16.562 5.44436C16.3017 5.18584 15.8683 5.30006 15.7212 5.63288C14.9742 7.3229 13.4178 9.75607 11.4286 9.75607C10.1975 9.92086 8.31688 8.86844 9.83483 3.64868C9.97151 3.17868 9.46972 2.80113 9.08645 3.11539C6.9046 4.90436 4 8.51143 4 13.504C4 17.6439 7.58172 21 12 21Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                                </svg>
                                            </NavLink>
                                        </CustomOverlayTrigger>
                                    </li>

                                    <li className='nav-item'>
                                        <CustomOverlayTrigger placement="bottom" tooltipId="tooltip-truyen-tranh" tooltip={<>Truyện tranh</>}>
                                            <NavLink className={({ isActive, isPending }) =>
                                                classNames("nav-link", { "active": isActive, "pending": isPending })
                                            } to={'/truyen-tranh'}>
                                                <svg className='nav-icon-svg' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" fill="none"><path d="M104.1 65.7v88.5c6.1-6.3 18.3-17.2 37-23.4 11.5-3.8 21.6-4.6 28.9-4.5V37.8c-8 .5-18.7 2.1-30.7 6.5-16.5 6.2-28.2 15.1-35.2 21.4zm-16.2 0v88.5c-6.1-6.3-18.3-17.2-37-23.4-11.5-3.8-21.6-4.6-28.9-4.5V37.8c8 .5 18.7 2.1 30.7 6.5 16.5 6.2 28.2 15.1 35.2 21.4z" fill="none" stroke="currentColor" strokeWidth="12" /></svg>
                                            </NavLink>
                                        </CustomOverlayTrigger>
                                    </li>
                                    <span>|</span>
                                    <li className='nav-item'>
                                        <NavLink className={({ isActive, isPending }) =>
                                            classNames("nav-link", { "active": isActive, "pending": isPending })
                                        } to={'/xep-hang-truyen'}>
                                            Xếp hạng truyện
                                        </NavLink>
                                    </li>

                                </ul>
                            </nav>
                        </div>
                        <div className="header-right">
                            {!isMobileSearchVisible && (
                                <div className='header-search me-3'>
                                    <Search />
                                </div>
                            )}
                            {isMobileSearchVisible && (
                                <button
                                    className="mobile-search-toggle-btn"
                                    onClick={() => setShowSearchPopup(true)}
                                    aria-label="Mở tìm kiếm"
                                >
                                    <i className="fa-regular fa-magnifying-glass"></i>
                                </button>
                            )}
                            {isLoggedIn && currentUser ? (
                                <>
                                    <NotificationDropdown
                                        openDropdown={openDropdown}
                                        toggleDropdown={toggleDropdown}
                                        dropdownRefCallback={dropdownRefCallback}
                                        currentStatusFilter={currentStatusFilter}
                                        handleFilterChange={handleFilterChange}
                                    />
                                    <UserDropdown
                                        openDropdown={openDropdown}
                                        toggleDropdown={toggleDropdown}
                                        dropdownRefCallback={dropdownRefCallback}
                                        logOut={logOut}
                                    />
                                </>
                            ) : (
                                <div className="nav-item">
                                    <CustomOverlayTrigger
                                        placement="bottom"
                                        tooltipId="tooltip-catalog"
                                        tooltip={<>Đăng nhập</>}
                                    >
                                        <Link to={'/auth'} className="btn btn-sm btn-icon">
                                            <FiLogIn />
                                        </Link>
                                    </CustomOverlayTrigger>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            <MobileSidebar
                show={showMobileMenu}
                onClose={() => setShowMobileMenu(false)}
                navLinks={navLinks} // Truyền danh sách link
            />
            {isMobileSearchVisible && (
                <SearchPopup
                    show={showSearchPopup}
                    onClose={() => setShowSearchPopup(false)}
                />
            )}
        </>
    );
}

export default Header;