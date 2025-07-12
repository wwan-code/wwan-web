import { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
} from '@features/notificationSlice';
import classNames from '@utils/classNames';
import NotificationItem from '@components/Notification/NotificationItem';
import { toast } from 'react-toastify';
import { FaRegBell } from "react-icons/fa";

const NOTIFICATION_DROPDOWN_ID = 1234;

const NotificationDropdown = ({ 
    openDropdown, 
    toggleDropdown, 
    dropdownRefCallback,
    currentStatusFilter,
    handleFilterChange 
}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const {
        items: notifications,
        unreadCount,
        loading: loadingNotificationsInitial,
        loadingMore,
        pagination: notificationPagination,
        error: notificationError
    } = useSelector(state => state.notifications);
    const notificationBodyRef = useRef(null);

    const handleToggleNotificationDropdown = useCallback((e) => {
        toggleDropdown(NOTIFICATION_DROPDOWN_ID, e);
    }, [toggleDropdown]);

    // Re-fetch notifications when the filter changes
    useEffect(() => {
        dispatch(fetchNotifications({ 
            page: 1, 
            limit: 10, 
            status: currentStatusFilter === 'all' ? undefined : currentStatusFilter 
        }));
    }, [dispatch, currentStatusFilter]);

    const handleNotificationClick = useCallback((notification) => {
        if (!notification.isRead) {
            dispatch(markAsRead(notification.id))
                .unwrap()
                .catch(err => toast.error(err.message || "Lỗi đánh dấu đã đọc."));
        }
        if (notification.link && notification.link !== '#') {
            navigate(notification.link);
        }
    }, [dispatch, navigate]);

    const handleMarkAllRead = useCallback(() => {
        if (unreadCount > 0) {
            dispatch(markAllAsRead())
                .unwrap()
                .catch(err => toast.error(err.message || "Lỗi đánh dấu tất cả đã đọc."));
        }
    }, [dispatch, unreadCount]);

    const loadMoreNotifications = useCallback(() => {
        if (notificationPagination && notificationPagination.currentPage < notificationPagination.totalPages && !loadingMore) {
            dispatch(fetchNotifications({
                page: notificationPagination.currentPage + 1,
                limit: notificationPagination.itemsPerPage,
                status: currentStatusFilter === 'all' ? undefined : currentStatusFilter
            }));
        }
    }, [dispatch, loadingMore, notificationPagination, currentStatusFilter]);

    useEffect(() => {
        const bodyEl = notificationBodyRef.current;
        if (bodyEl && openDropdown === NOTIFICATION_DROPDOWN_ID) {
            const scrollHandler = () => {
                if (bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight < 100) {
                    loadMoreNotifications();
                }
            };
            bodyEl.addEventListener('scroll', scrollHandler, { passive: true });
            return () => bodyEl.removeEventListener('scroll', scrollHandler);
        }
    }, [openDropdown, loadMoreNotifications]);

    return (
        <div className="dropdown-notification dropdown" ref={(el) => dropdownRefCallback(el, NOTIFICATION_DROPDOWN_ID)}>
            <button
                role='button'
                className="dropdown-notification-icon dropdown-toggle"
                onClick={handleToggleNotificationDropdown}
                aria-label="Thông báo"
                aria-haspopup="true"
                aria-expanded={openDropdown === NOTIFICATION_DROPDOWN_ID}
            >
                <FaRegBell />
                {unreadCount > 0 && (
                    <span className="dropdown-notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
            <div
                className={classNames("dropdown-notification-menu", "dropdown-menu", "dropdown-menu-end", { "show": openDropdown === NOTIFICATION_DROPDOWN_ID })}
                data-bs-popper
            >
                <div className="dropdown-notification__header">
                    <h6 className="dropdown-notification__header--title mb-0">Thông báo</h6>
                    {notifications.length > 0 && unreadCount > 0 && (
                        <span type="button" className="dropdown-notification__header--link" onClick={handleMarkAllRead} disabled={loadingNotificationsInitial === 'pending' || loadingMore}>
                            Đọc tất cả
                        </span>
                    )}
                </div>
                <div className="dropdown-notification__tabs">
                    <button 
                        type="button" 
                        className={classNames("dropdown-notification__tabs--tab", { 'tab-active': currentStatusFilter === 'all' })} 
                        onClick={() => handleFilterChange('all')}
                    >
                        Tất cả
                    </button>
                    <button 
                        type="button" 
                        className={classNames("dropdown-notification__tabs--tab", { 'tab-active': currentStatusFilter === 'unread' })} 
                        onClick={() => handleFilterChange('unread')}
                    >
                        Chưa đọc
                    </button>
                </div>

                <div className="dropdown-notification__list" ref={notificationBodyRef}>
                    {loadingNotificationsInitial === 'pending' && notifications.length === 0 && <div className="notification-loader"><span className="spinner--small"></span></div>}
                    {loadingNotificationsInitial === 'failed' && notificationError && <p className='notification-error-message'>{notificationError}</p>}
                    {loadingNotificationsInitial === 'succeeded' && notifications.length === 0 && <p className='notification-empty-message'>Bạn chưa có thông báo nào.</p>}
                    {notifications.map(notif => {
                        return (
                            <NotificationItem
                                key={notif.id}
                                notification={notif}
                                onClick={() => handleNotificationClick(notif)}
                            />
                        )
                    })}
                    {loadingMore && (
                        <div className="notification-loader text-center p-2">
                            <span className="spinner--small"></span>
                        </div>
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="dropdown-notification-footer">
                        <Link to="/thong-bao" className="btn-view-all-notifications" onClick={() => toggleDropdown(NOTIFICATION_DROPDOWN_ID)}>
                            Xem tất cả thông báo
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown; 