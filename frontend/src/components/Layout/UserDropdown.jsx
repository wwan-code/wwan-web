import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@contexts/AppContext';
import UserAvatarDisplay from '@components/Common/UserAvatarDisplay';

const USER_DROPDOWN_ID = 3242;

const UserDropdown = ({ openDropdown, toggleDropdown, dropdownRefCallback, logOut }) => {
    const { currentUser, uiPreferences, setUIPreference, AVAILABLE_ACCENT_COLORS } = useAppContext();
    const [showThemeSettingsPanel, setShowThemeSettingsPanel] = useState(false);

    useEffect(() => {
        if (openDropdown !== USER_DROPDOWN_ID) {
            setShowThemeSettingsPanel(false);
        }
    }, [openDropdown]);

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

    const handleAccentColorChange = (colorValue) => {
        setUIPreference('accentColor', colorValue);
    };

    const formatRoles = (roles = []) => {
        return roles.map(role => role.replace('ROLE_', '')).join(', ') || 'User';
    };

    return (
        <div className="dropdown-user dropdown" ref={(el) => dropdownRefCallback(el, USER_DROPDOWN_ID)}>
            <button
                role='button'
                className="header-user-icon dropdown-toggle"
                onClick={handleUserDropdownToggle}
                aria-haspopup="true"
                aria-expanded={openDropdown === USER_DROPDOWN_ID}
            >
                <UserAvatarDisplay userToDisplay={currentUser} size={"32"} />
            </button>
            <div
                className={`dropdown-menu dropdown-menu-end ${openDropdown === USER_DROPDOWN_ID ? "show" : ""}`}
                data-bs-popper
            >
                <div className="position-relative overflow-hidden">
                    <ul className="list-menu-items" style={{
                        transform: showThemeSettingsPanel ? "translateX(-100%)" : "translateX(0%)",
                        opacity: showThemeSettingsPanel ? 0 : 1,
                        visibility: showThemeSettingsPanel ? "hidden" : "visible",
                        transition: 'opacity .25s, transform .25s, visibility .25s'
                    }}>
                        <li role="menuitem">
                            <Link className="dropdown-item" to="/profile">
                                <div className="d-flex">
                                    <div className="flex-shrink-0 me-3">
                                        <UserAvatarDisplay userToDisplay={currentUser} size={"32"} />
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="mb-0 dropdown-item-title">{currentUser.name}</h6>
                                        <small className="text-body-secondary d-block">{formatRoles(currentUser.roles)}</small>
                                    </div>
                                </div>
                            </Link>
                        </li>
                        <li><div className="dropdown-divider my-1"></div></li>
                        <li role="menuitem">
                            <button className="dropdown-item" onClick={handleThemeSettingToggle} aria-expanded={showThemeSettingsPanel}>
                                <span className="d-flex align-items-center align-middle">
                                    <i className="icon-base flex-shrink-0 fa-regular fa-palette me-3"></i>
                                    <span className="flex-grow-1 align-middle">Giao diện</span>
                                </span>
                                <i className="fa-solid fa-chevron-right ms-auto text-muted small"></i>
                            </button>
                        </li>
                        <li role="menuitem">
                            <Link className="dropdown-item" to={'/bang-xep-hang'}>
                                <span className="d-flex align-items-center align-middle">
                                    <i className="icon-base flex-shrink-0 fa-regular fa-trophy me-3"></i>
                                    <span className="flex-grow-1 align-middle">Bảng xếp hạng người dùng</span>
                                </span>
                            </Link>
                        </li>
                        <li role="menuitem">
                            <Link className="dropdown-item" to="/faq">
                                <span className="d-flex align-items-center align-middle">
                                    <i className="icon-base flex-shrink-0 fa-regular fa-circle-question me-3"></i>
                                    <span className="flex-grow-1 align-middle">FAQ</span>
                                </span>
                            </Link>
                        </li>
                        <li><div className="dropdown-divider my-1"></div></li>
                        <li role="menuitem">
                            <button className="dropdown-item text-danger" onClick={logOut}>
                                <span className="d-flex align-items-center align-middle">
                                    <i className="icon-base flex-shrink-0 fa-regular fa-power-off me-3"></i>
                                    <span className="flex-grow-1 align-middle">Đăng xuất</span>
                                </span>
                            </button>
                        </li>
                    </ul>
                    <div
                        className="settings-panel"
                        style={{
                            transform: showThemeSettingsPanel ? "translateX(0%)" : "translateX(100%)",
                            opacity: showThemeSettingsPanel ? 1 : 0,
                            visibility: showThemeSettingsPanel ? "visible" : "hidden"
                        }}
                    >
                        <div className="settings-panel__header">
                            <div className="settings-panel__header-left">
                                <div role="button" className="settings-panel__back-button" onClick={handleThemeSettingToggle} aria-label="Quay lại" >
                                    <i className="settings-panel__icon-back"></i>
                                </div>
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
                                            <i className={`settings-panel__icon-moon ${uiPreferences.theme === 'dark' ? 'fa-solid' : uiPreferences.theme === 'light' ? 'fa-sun far' : 'fa-desktop-arrow-down fas'}`}></i>
                                        </div>
                                    </div>
                                    <div className="settings-panel__option-details">
                                        <span className="settings-panel__option-title">Chế độ tối</span>
                                    </div>
                                </div>

                                <div className="settings-panel__mode-options">
                                    {["light", "dark", "system"].map((themeOptionValue) => (
                                        <label className="settings-panel__label" key={themeOptionValue}>
                                            <div className="settings-panel__mode-option-wrap">
                                                <div
                                                    className={`settings-panel__mode-option ${uiPreferences.theme === themeOptionValue ? "active" : ""}`}
                                                    onClick={() => setUIPreference('theme', themeOptionValue)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setUIPreference('theme', themeOptionValue); }}
                                                >
                                                    <div>
                                                        <span className="settings-panel__mode-title">
                                                            {themeOptionValue === 'light' ? 'Đang tắt' : themeOptionValue === 'dark' ? 'Đang bật' : 'Theo thiết bị'}
                                                        </span>
                                                        {themeOptionValue === 'system' && (
                                                            <p className="settings-panel__mode-subtitle">
                                                                Chúng tôi sẽ tự động điều chỉnh theo cài đặt trên thiết bị của bạn.
                                                            </p>
                                                        )}
                                                    </div>
                                                    <i className="settings-panel__radio-icon"></i>
                                                </div>
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
                                                    <i className="fas fa-palette" style={{ color: 'white' }}></i>
                                                </div>
                                            </div>
                                            <div className="settings-panel__option-details">
                                                <span className="settings-panel__option-title">Màu nhấn</span>
                                            </div>
                                        </div>
                                        <div className="settings-panel__mode-options d-flex flex-wrap justify-content-start">
                                            {AVAILABLE_ACCENT_COLORS.map(color => (
                                                <button
                                                    key={color.value}
                                                    title={color.name}
                                                    className={`btn btn-sm me-2 mb-2 ${uiPreferences.accentColor === color.value ? 'active border-2 shadow-sm' : 'border'}`}
                                                    style={{ backgroundColor: color.value, width: '28px', height: '28px', padding: 0, borderColor: uiPreferences.accentColor === color.value ? 'var(--w-primary)' : 'var(--w-border-color)' }}
                                                    onClick={() => handleAccentColorChange(color.value)}
                                                >
                                                    {uiPreferences.accentColor === color.value && <i className="fas fa-check" style={{ color: '#fff', fontSize: '0.7rem' }}></i>}
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
        </div>
    );
};

export default UserDropdown; 