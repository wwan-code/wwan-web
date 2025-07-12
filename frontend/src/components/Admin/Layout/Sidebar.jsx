// src/components/Admin/layout/Sidebar.jsx
import { Link, NavLink, useLocation } from "react-router-dom";
import useRipple from "@hooks/useRipple";
import classNames from "@utils/classNames";
import logoMini from "@assets/images/wwan-icon.png";
import { useSelector } from "react-redux";
import React, { useRef, useCallback, useState, useEffect } from "react";
import { getAvatarUrl } from "@utils/getAvatarUrl";
import navData from "./sidebarNavData";

// Nav link without sub-items
const SidebarNavItem = React.memo(({ to, icon: Icon, label, createRipple }) => (
    <li className="nav-item">
        <NavLink
            className={({ isActive }) => classNames('nav-link ripple-link', { active: isActive })}
            to={to}
            onClick={createRipple}
        >
            <Icon className="nav-icon" />
            <span className="nav-link-text">{label}</span>
        </NavLink>
    </li>
));

// Nav group with collapsible children
const SidebarNavGroup = ({ node, isOpen, onToggle }) => {
    const groupItemsRef = useRef(null);

    useEffect(() => {
        if (!groupItemsRef.current) return;
        if (isOpen) {
            const scrollHeight = groupItemsRef.current.scrollHeight;
            groupItemsRef.current.style.height = `${scrollHeight}px`;
        } else {
            groupItemsRef.current.style.height = '0';
        }
    }, [isOpen]);

    return (
        <li className={`nav-group ${isOpen ? 'show active' : ''}`}>
            <span role="button" className="nav-link nav-group-toggle" onClick={() => onToggle(node.id)}>
                {React.createElement(node.icon, { className: 'nav-icon' })}
                <span className="nav-link-text">{node.label}</span>
            </span>
            <ul className="nav-group-items compact" ref={groupItemsRef}>
                {node.items.map((child) => (
                    <li className="nav-item" key={child.to}>
                        <NavLink
                            className={({ isActive }) => classNames('nav-link', { active: isActive })}
                            to={child.to}
                            title={child.label}
                        >
                            <span className="nav-icon nav-icon-bullet"></span>
                            <span className="nav-link-text">{child.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </li>
    );
};

const Sidebar = React.memo(({ isCollapsed, isMobileOpen, handleToggleSidebar, isMobile }) => {
    const { user: currentUser } = useSelector((state) => state.user);
    const { createRipple } = useRipple();
    const location = useLocation();
    const sidebarRef = useRef(null);

    /* ------------------------------------------------------------------
     * NavGroup open/close state
     * ------------------------------------------------------------------*/
    const getInitialActiveGroup = useCallback((path) => {
        if (path.startsWith('/admin/movie')) return 'movie';
        if (path.startsWith('/admin/comics')) return 'comics';
        return null;
    }, []);
    const [activeGroup, setActiveGroup] = useState(() => getInitialActiveGroup(location.pathname));

    // Keep active group in sync with route changes (e.g. user navigates via breadcrumbs)
    useEffect(() => {
        setActiveGroup(getInitialActiveGroup(location.pathname));
    }, [location.pathname, getInitialActiveGroup]);

    // Close any open group when sidebar is collapsed or device switches
    useEffect(() => {
        if (!isMobile && isCollapsed) {
            setActiveGroup(null);
        }
    }, [isMobile, isCollapsed]);

    /* ------------------------------------------------------------------
     * Hover behaviours for collapsed desktop sidebar
     * ------------------------------------------------------------------*/
    const handleMouseEnter = () => {
        if (!isMobile && isCollapsed) {
            sidebarRef.current?.classList.add('sidebar-hover-unfold');
        }
    };

    const handleMouseLeave = () => {
        if (!isMobile && isCollapsed) {
            sidebarRef.current?.classList.remove('sidebar-hover-unfold');
            setActiveGroup(null); // Auto-close groups when mouse leaves
        }
    };

    /* ------------------------------------------------------------------
     * Render helpers
     * ------------------------------------------------------------------*/
    const handleNavGroupToggle = (groupId) => {
        // Prevent toggle when sidebar is collapsed without hover-unfold state
        if (!isMobile && isCollapsed && !sidebarRef.current?.classList.contains('sidebar-hover-unfold')) {
            return;
        }
        setActiveGroup((prev) => (prev === groupId ? null : groupId));
    };

    const renderNavItems = useCallback(() => {
        return navData.map((node, index) => {
            if (node.type === 'title') {
                return (
                    <li key={index} className="nav-title">
                        <span className="nav-link-text">{node.label}</span>
                    </li>
                );
            }

            if (node.type === 'item') {
                return (
                    <SidebarNavItem
                        key={index}
                        to={node.to}
                        icon={node.icon}
                        label={node.label}
                        createRipple={createRipple}
                    />
                );
            }

            if (node.type === 'group') {
                const isOpen = activeGroup === node.id;
                return (
                    <SidebarNavGroup
                        key={index}
                        node={node}
                        isOpen={isOpen}
                        onToggle={handleNavGroupToggle}
                    />
                );
            }

            return null;
        });
    }, [activeGroup, createRipple]);

    /* ------------------------------------------------------------------
     * Component render
     * ------------------------------------------------------------------*/
    return (
        <div
            ref={sidebarRef}
            className={classNames(
                'sidebar sidebar-dark sidebar-fixed border-end',
                {
                    'sidebar-collapsed': !isMobile && isCollapsed,
                    'sidebar-unfoldable': !isMobile,
                    'sidebar-mobile-open': isMobile && isMobileOpen,
                }
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <img src={logoMini} alt="" className="sidebar-brand-img" />
                    <h4 className="sidebar-brand-text">Admin</h4>
                </div>

                {(isMobile || isCollapsed) && (
                    <button
                        className="btn-close"
                        type="button"
                        onClick={handleToggleSidebar}
                        aria-label="Close sidebar"
                    ></button>
                )}
            </div>

            <ul className="sidebar-nav simplebar-scrollable-y">
                <div className="simplebar-wrapper">
                    <div className="simplebar-mask">
                        <div className="simplebar-offset">
                            <div className="simplebar-content-wrapper" tabIndex="0" role="region" aria-label="scrollable content">
                                <div className="simplebar-content">
                                    {renderNavItems()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="simplebar-placeholder"></div>
                </div>
            </ul>

            {!isMobile && (
                <div className="sidebar-footer border-top">
                    <div className="sidebar-footer-content">
                        {currentUser && (
                            <div className="sidebar-user">
                                <div className="avatar avatar-sm sidebar-user-avatar">
                                    <img className="avatar-img" src={getAvatarUrl(currentUser)} alt={currentUser.name} />
                                </div>
                                <div className="sidebar-user-details">
                                    <div className="sidebar-user-name">{currentUser.name || 'Admin'}</div>
                                    <div className="sidebar-user-role">
                                        {currentUser.roles?.map((role, index) => {
                                            let label = '';
                                            switch (role) {
                                                case 'ROLE_ADMIN':
                                                    label = 'Admin';
                                                    break;
                                                case 'ROLE_EDITOR':
                                                    label = 'Editor';
                                                    break;
                                                case 'ROLE_USER':
                                                    label = 'User';
                                                    break;
                                                default:
                                                    label = role.replace(/^ROLE_/, '');
                                            }
                                            return (
                                                <span key={index} className="badge bg-secondary me-1">
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="sidebar-footer-end d-flex align-items-center justify-content-center">
                        <button
                            className="sidebar-toggler"
                            type="button"
                            data-coreui-toggle="unfoldable"
                            onClick={handleToggleSidebar}
                            aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                        ></button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default Sidebar;