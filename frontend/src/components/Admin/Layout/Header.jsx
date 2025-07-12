// src/components/Admin/layout/Header.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useDropdown from "@hooks/useDropdown";
import { useAppContext } from "@contexts/AppContext";
import { logout } from "@features/userSlice";
import NotificationDropdown from '@components/Layout/NotificationDropdown';

const USER_DROPDOWN_ID = 111;

const Header = React.memo(({ handleToggleSidebar }) => {
    const { user: currentUser } = useSelector((state) => state.user);
    const {
        uiPreferences,
        setUIPreference,
        AVAILABLE_ACCENT_COLORS
    } = useAppContext();


    const { openDropdown, toggleDropdown, dropdownRefCallback } = useDropdown();
    const dispatch = useDispatch();
    const location = useLocation();

    const [showThemeSettingsPanel, setShowThemeSettingsPanel] = useState(false);
    // Notification dropdown state
    const [currentStatusFilter, setCurrentStatusFilter] = useState('all');
    const handleFilterChange = useCallback((newStatus) => {
        if (newStatus !== currentStatusFilter) {
            setCurrentStatusFilter(newStatus);
        }
    }, [currentStatusFilter]);

    const breadcrumbItems = location.pathname.replace('/admin', '').split('/').filter(item => item !== '');
    const convertUrlToText = (url) => {
        return url.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\//g, ' ').trim();
    };

    const logOut = useCallback(() => dispatch(logout())
        .then(() => {
            window.location.href = '/login';
        })
        , [dispatch]);

    const getAvatarUrl = () => {
        if (!currentUser) return `https://ui-avatars.com/api/?name=A&background=random&color=white`;
        if (currentUser.avatar === null || !currentUser.avatar) {
            const namePart = currentUser.name || 'Admin';
            const initials = namePart.split(' ').map(word => word[0]).join('').toUpperCase();
            return `https://ui-avatars.com/api/?name=${initials}&background=random&color=white`;
        } else {
            return currentUser.avatar.startsWith('http') ? currentUser.avatar : `/${currentUser.avatar}`;
        }
    };

    const handleUserDropdownToggle = (e) => {
        toggleDropdown(USER_DROPDOWN_ID, e);
        if (openDropdown === USER_DROPDOWN_ID) {
            setShowThemeSettingsPanel(false);
        }
    };

    const handleThemeSettingToggle = (e) => {
        e.stopPropagation();
        setShowThemeSettingsPanel(prev => !prev);
    };

    const handleThemeChange = (themeValue) => {
        setUIPreference('theme', themeValue);
    };

    const handleAccentColorChange = (colorValue) => {
        setUIPreference('accentColor', colorValue);
    };

    return (
        <header className="admin-header p-0 mb-4">
            <div className="container-fluid border-bottom px-4 py-2 d-flex flex-wrap align-items-center justify-content-between">
                <button className="header-toggler" type="button" onClick={handleToggleSidebar}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-list" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M2.5 12.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0-5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0-5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11z" />
                    </svg>
                </button>

                <ul className="header-nav ms-auto align-items-center">
                    <li className="nav-item mx-2">
                        <NotificationDropdown
                            openDropdown={openDropdown}
                            toggleDropdown={toggleDropdown}
                            dropdownRefCallback={dropdownRefCallback}
                            currentStatusFilter={currentStatusFilter}
                            handleFilterChange={handleFilterChange}
                        />
                    </li>

                    <li className="nav-item py-1 d-none d-md-block">
                        <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
                    </li>

                    <li className="nav-item dropdown" ref={(el) => dropdownRefCallback(el, USER_DROPDOWN_ID)}>
                        <button className="btn btn-link nav-link py-2 px-2 d-flex align-items-center"
                            aria-label="User menu"
                            onClick={handleUserDropdownToggle}
                        >
                            <div className="avatar avatar-online">
                                <img className="avatar-img rounded-circle" src={getAvatarUrl()} alt={currentUser?.name || "Admin"} />
                            </div>
                        </button>
                        <div className={`dropdown-menu dropdown-menu-end pt-0 shadow-lg ${openDropdown === USER_DROPDOWN_ID ? " show" : ""}`} data-bs-popper>
                            <div className="position-relative overflow-hidden" style={{ minHeight: '200px' }}>
                                <ul className="w-100 list-unstyled mb-0"
                                    style={{
                                        transform: showThemeSettingsPanel ? "translateX(-100%)" : "translateX(0%)",
                                        opacity: showThemeSettingsPanel ? 0 : 1,
                                        visibility: showThemeSettingsPanel ? "hidden" : "visible",
                                        transition: 'opacity .25s, transform .25s, visibility .25s'
                                    }}>
                                    <li role="menuitem">
                                        <div className="dropdown-header bg-body-tertiary text-body-secondary fw-semibold rounded-top py-2 px-3 mb-2">
                                            {currentUser?.name || 'Admin Account'}
                                            <small className="d-block text-muted">{currentUser?.email}</small>
                                        </div>
                                    </li>

                                    <li role="menuitem">
                                        <Link className="dropdown-item" to="/admin/profile">
                                            <i className="icon-base fa-regular fa-user me-2"></i>Hồ sơ của tôi
                                        </Link>
                                    </li>
                                    <li role="menuitem">
                                        <Link className="dropdown-item" to="/" target="_blank">
                                            <i className="icon-base fa-regular fa-link me-2"></i>Xem trang web
                                        </Link>
                                    </li>
                                    <li role="menuitem">
                                        <Link className="dropdown-item" to="/admin/settings">
                                            <i className="icon-base fa-regular fa-cog me-2"></i>Cài đặt
                                        </Link>
                                    </li>
                                    <li role="menuitem">
                                        <button className="dropdown-item w-100" onClick={handleThemeSettingToggle} aria-expanded={showThemeSettingsPanel}>
                                            <span className="d-flex align-items-center">
                                                <i className="icon-base fa-regular fa-palette me-2"></i>
                                                <span>Giao diện</span>
                                                <i className="fa-solid fa-chevron-right ms-auto text-muted small"></i>
                                            </span>
                                        </button>
                                    </li>
                                    <li><div className="dropdown-divider my-1"></div></li>
                                    <li role="menuitem">
                                        <button className="dropdown-item text-danger w-100" type="button" onClick={logOut}>
                                            <i className="icon-base fa-regular fa-power-off me-2"></i>Đăng xuất
                                        </button>
                                    </li>
                                </ul>

                                <div
                                    className="settings-panel"
                                    style={{
                                        transform: showThemeSettingsPanel ? "translateX(0%)" : "translateX(100%)",
                                        opacity: showThemeSettingsPanel ? 1 : 0,
                                        visibility: showThemeSettingsPanel ? "visible" : "hidden",
                                        transition: 'opacity .25s, transform .25s, visibility .25s',
                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                        backgroundColor: 'var(--w-dropdown-bg, var(--w-paper-bg))'
                                    }}
                                >
                                    <div className="settings-panel__header">
                                        <div className="settings-panel__header-left">
                                            <button type="button" className="settings-panel__back-button btn btn-icon btn-sm" onClick={handleThemeSettingToggle} aria-label="Quay lại" >
                                                <i className="settings-panel__icon-back"></i>
                                            </button>
                                        </div>
                                        <div className="settings-panel__header-right">
                                            <span className="settings-panel__title">Tùy chỉnh Giao diện</span>
                                        </div>
                                    </div>
                                    <div className="settings-panel__wrapper">
                                        <div className="settings-panel__content">
                                            <div className="settings-panel__option mb-2">
                                                <div className="settings-panel__option-wrap-icon">
                                                    <div className="settings-panel__option-icon">
                                                        <i className={`settings-panel__icon-moon fas ${uiPreferences.theme === 'dark' ? 'fa-moon' : (uiPreferences.theme === 'light' || (uiPreferences.theme === 'system' && !(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? 'fa-sun' : 'fa-desktop')}`}></i>
                                                    </div>
                                                </div>
                                                <div className="settings-panel__option-details">
                                                    <span className="settings-panel__option-title">Chế độ</span>
                                                </div>
                                            </div>
                                            <div className="settings-panel__mode-options">
                                                {['light', 'dark', 'system'].map((themeVal) => (
                                                    <label className="settings-panel__label" key={themeVal}>
                                                        <div className={`settings-panel__mode-option ${uiPreferences.theme === themeVal ? "active" : ""}`} onClick={() => handleThemeChange(themeVal)} >
                                                            <div>
                                                                <span className="settings-panel__mode-title">
                                                                    {themeVal === 'light' ? 'Sáng' : themeVal === 'dark' ? 'Tối' : 'Theo hệ thống'}
                                                                </span>
                                                                {themeVal === 'system' && <span className="settings-panel__mode-subtitle">Tự động theo thiết bị.</span>}
                                                            </div>
                                                            <i className="settings-panel__radio-icon"></i>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            {AVAILABLE_ACCENT_COLORS && AVAILABLE_ACCENT_COLORS.length > 0 && (
                                                <>
                                                    <hr className='my-3' />
                                                    <div className="settings-panel__option mb-2">
                                                        <div className="settings-panel__option-wrap-icon">
                                                            <div className="settings-panel__option-icon" style={{ backgroundColor: uiPreferences.accentColor }}>
                                                                <i className="fas fa-palette" style={{ color: 'var(--w-white)' }}></i>
                                                            </div>
                                                        </div>
                                                        <div className="settings-panel__option-details">
                                                            <span className="settings-panel__option-title">Màu Nhấn</span>
                                                        </div>
                                                    </div>
                                                    <div className="settings-panel__mode-options d-flex flex-wrap justify-content-start">
                                                        {AVAILABLE_ACCENT_COLORS.map(color => (
                                                            <button
                                                                key={color.value}
                                                                title={color.name}
                                                                className={`btn btn-sm me-2 mb-2 accent-color-swatch ${uiPreferences.accentColor === color.value ? 'active' : ''}`}
                                                                style={{ backgroundColor: color.value }}
                                                                onClick={() => handleAccentColorChange(color.value)}
                                                            >
                                                                {uiPreferences.accentColor === color.value && <i className="fas fa-check"></i>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
            <div className="container-fluid px-4 d-flex flex-wrap align-items-center justify-content-between">
                <nav aria-label="breadcrumb" >
                    <ol className="breadcrumb my-0">
                        <li className="breadcrumb-item"><Link to="/admin/dashboard">Admin</Link></li>
                        {breadcrumbItems.map((item, index) => (
                            <li key={index} className={`breadcrumb-item ${index === breadcrumbItems.length - 1 ? 'active' : ''}`}>
                                {index === breadcrumbItems.length - 1 ? (
                                    convertUrlToText(item)
                                ) : (
                                    <span>{convertUrlToText(item)}</span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            </div>
        </header>
    )
});

export default Header;