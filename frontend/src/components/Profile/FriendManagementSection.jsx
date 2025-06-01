// src/components/Profile/FriendManagementSection.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import UserAvatarDisplay from '@components/Common/UserAvatarDisplay';
import classNames from '@utils/classNames';
import '@assets/scss/components/profile/_friend-management-section.scss';

const FriendManagementSection = ({
    friends = [],
    friendRequests = [],
    sentFriendRequests = [],
    loading, // Trạng thái loading chung cho cả 3 danh sách
    onAcceptRequest,
    onRejectRequest,
    onCancelRequest,
    onRemoveFriend,
    isPublicView = false, // Nếu đang xem profile người khác
    profileUserUuid = null // UUID của người đang xem profile (nếu isPublicView)
}) => {

    const renderFriendItem = (user, actions) => (
        <li key={user.id} className="friend-list-item">
            <Link to={`/profile/${user.uuid}`} className="friend-info">
                <UserAvatarDisplay userToDisplay={user} size="36" />
                <span className="friend-name" title={user.email || ''}>{user.name || 'Người dùng ẩn'}</span>
            </Link>
            {actions && <div className="friend-actions">{actions}</div>}
        </li>
    );

    const renderList = (title, items, renderItemActions, listType) => (
        <div className={classNames("friend-list-section", `friend-list-section--${listType}`)}>
            <h5 className="friend-list-section__title">{title} <span className="count-badge">({items.length})</span></h5>
            {loading && items.length === 0 ? ( // Chỉ hiển thị loading nếu chưa có item nào
                <div className="loading-placeholder--small text-center p-3"><span className="spinner--small"></span></div>
            ) : items.length > 0 ? (
                <ul className="friend-list-ul">
                    {items.map((item) => renderFriendItem(item.user || item, renderItemActions && renderItemActions(item.user || item)))}
                </ul>
            ) : (
                <p className="no-content-message small text-center">Danh sách trống.</p>
            )}
        </div>
    );

    // Nếu là public view và không có bạn bè để hiển thị, có thể không render gì cả hoặc thông báo khác
    if (isPublicView && friends.length === 0) {
        return <p className="no-content-message text-center">Người dùng này chưa có bạn bè hoặc đã ẩn danh sách.</p>;
    }

    return (
        <div className="friend-management-wrapper">
            {/* Danh sách bạn bè */}
            {renderList(isPublicView ? `Bạn bè của ${profileUserUuid ? 'người này' : ''}` : "Bạn bè", friends, (friend) => (
                !isPublicView && ( // Chỉ hiển thị nút nếu là profile của chính mình
                    <>
                        <button className="btn-icon btn--sm btn--danger-ghost" onClick={() => onRemoveFriend(friend.id)} title="Hủy kết bạn">
                            <i className="fas fa-user-minus"></i>
                        </button>
                        {/* <button className="btn-icon btn--sm btn--primary-ghost" title="Nhắn tin">
                            <i className="fas fa-comment-dots"></i>
                        </button> */}
                    </>
                )
            ), 'friends')}

            {/* Chỉ hiển thị lời mời nếu là profile của chính mình */}
            {!isPublicView && (
                <>
                    {renderList("Yêu cầu kết bạn", friendRequests, (request) => (
                        <>
                            <button className="btn-icon btn--sm btn--success" onClick={() => onAcceptRequest(request.user.id)} title="Chấp nhận"> {/* request.user.id */}
                                <i className="fas fa-user-check"></i>
                            </button>
                            <button className="btn-icon btn--sm btn--warning" onClick={() => onRejectRequest(request.user.id)} title="Từ chối">
                                <i className="fas fa-user-times"></i>
                            </button>
                        </>
                    ), 'received-requests')}

                    {renderList("Lời mời đã gửi", sentFriendRequests, (request) => (
                        <button className="btn-icon btn--sm btn--secondary-ghost" onClick={() => onCancelRequest(request.id)} title="Hủy lời mời">
                            <i className="fas fa-user-clock"></i> <span>Hủy</span>
                        </button>
                    ), 'sent-requests')}
                </>
            )}
        </div>
    );
};

export default FriendManagementSection;