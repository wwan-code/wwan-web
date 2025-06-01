// src/components/Challenges/ChallengeCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import classNames from '@utils/classNames'; // Sử dụng alias

// Import SCSS cho component này (sẽ tạo ở bước sau)
import '@assets/scss/components/challenges/_challenge-card.scss'; // Sử dụng alias

const ChallengeCard = ({ challenge, onJoinChallenge, onClaimReward, isJoining, isClaiming }) => {
    if (!challenge) return null;

    const {
        title,
        slug, // Để tạo link chi tiết nếu có
        description,
        type,
        targetCount,
        criteria,
        pointsReward,
        rewardBadge, // Object badge từ include
        rewardShopItem, // Object shop item từ include
        coverImageUrl,
        isActive, // Thử thách còn hoạt động không
        endDate,
        durationForUserDays, // Thời hạn cho user sau khi join
        userProgress // { currentCount, status, startedAt, completedAt }
    } = challenge;

    const getProgressPercent = () => {
        if (!userProgress || targetCount <= 0) return 0;
        if (userProgress.status === 'COMPLETED' || userProgress.status === 'REWARD_CLAIMED') return 100;
        return Math.min(100, Math.floor((userProgress.currentCount / targetCount) * 100));
    };

    const progressPercent = getProgressPercent();
    const isCompleted = userProgress?.status === 'COMPLETED';
    const isClaimed = userProgress?.status === 'REWARD_CLAIMED';
    const isInProgress = userProgress?.status === 'IN_PROGRESS';
    const notJoined = !userProgress;

    const coverStyle = coverImageUrl
        ? { backgroundImage: `url(${coverImageUrl.startsWith('http') ? coverImageUrl : `/${coverImageUrl}`})` }
        : {};

    let deadlineInfo = null;
    if (endDate) {
        const ed = new Date(endDate);
        if (ed > new Date()) {
            deadlineInfo = `Kết thúc: ${ed.toLocaleDateString('vi-VN')}`;
        } else {
            deadlineInfo = `Đã kết thúc`;
        }
    } else if (durationForUserDays && userProgress?.startedAt) {
        const started = new Date(userProgress.startedAt);
        const deadline = new Date(started.setDate(started.getDate() + durationForUserDays));
        if (deadline > new Date()) {
            deadlineInfo = `Hoàn thành trước: ${deadline.toLocaleDateString('vi-VN')}`;
        } else if (!isCompleted && !isClaimed) {
            deadlineInfo = `Đã hết hạn tham gia`;
        }
    }

    const getReadableCriteria = () => {
        if (!criteria) return `Hoàn thành ${targetCount} mục tiêu.`;
        // Tùy chỉnh hiển thị criteria dựa trên challenge.type
        switch (type) {
            case 'WATCH_X_MOVIES':
                return `Xem ${targetCount} bộ phim bất kỳ.`;
            case 'WATCH_GENRE_MOVIES':
                return `Xem ${targetCount} phim thuộc thể loại ${criteria.genreNames?.join(', ') || 'chỉ định'}.`; // Giả sử backend trả về genreNames
            case 'READ_X_CHAPTERS':
                return `Đọc ${targetCount} chương truyện.`;
            // Thêm các case khác
            default:
                return `Hoàn thành ${targetCount} mục tiêu của thử thách.`;
        }
    };


    return (
        <div className={classNames("challenge-card", {
            'challenge--completed': isCompleted || isClaimed,
            'challenge--in-progress': isInProgress,
            'challenge--not-joined': notJoined,
            'challenge--expired': (endDate && new Date(endDate) < new Date()) || (deadlineInfo === 'Đã hết hạn tham gia' && !isCompleted && !isClaimed)
        })}>
            <Link to={`/challenges/${slug || challenge.id}`} className="challenge-card__link-overlay"></Link>
            <div className="challenge-card__cover" style={coverStyle}>
                {!coverImageUrl && <span className="challenge-card__cover-placeholder"><i className="fas fa-trophy"></i></span>}
                <div className="challenge-card__type-badge">{type.replace(/_/g, ' ').toLowerCase()}</div>
            </div>
            <div className="challenge-card__content">
                <h4 className="challenge-card__title" title={title}>{title}</h4>
                <p className="challenge-card__description">{description?.substring(0, 100)}{description?.length > 100 ? '...' : ''}</p>
                <p className="challenge-card__criteria">{getReadableCriteria()}</p>

                {/* Phần thưởng */}
                <div className="challenge-card__rewards">
                    {pointsReward > 0 && (
                        <span className="reward-tag points-reward" title={`${pointsReward} điểm kinh nghiệm`}>
                            <i className="fas fa-star icon-before-small"></i> {pointsReward.toLocaleString()} XP
                        </span>
                    )}
                    {rewardBadge && (
                        <span className="reward-tag badge-reward" title={`Huy hiệu: ${rewardBadge.name}`}>
                            {rewardBadge.iconUrl?.startsWith('fa') ? <i className={`${rewardBadge.iconUrl} icon-before-small`}></i> : <img src={rewardBadge.iconUrl} alt="badge" className="reward-icon-img"/>}
                            {rewardBadge.name}
                        </span>
                    )}
                    {rewardShopItem && (
                         <span className="reward-tag shopitem-reward" title={`Vật phẩm: ${rewardShopItem.name}`}>
                            {rewardShopItem.iconUrl?.startsWith('fa') ? <i className={`${rewardShopItem.iconUrl} icon-before-small`}></i> : <img src={rewardShopItem.iconUrl} alt="item" className="reward-icon-img"/>}
                            {rewardShopItem.name}
                        </span>
                    )}
                </div>

                {/* Tiến độ và Deadline */}
                {deadlineInfo && <p className="challenge-card__deadline">{deadlineInfo}</p>}

                {(isInProgress || isCompleted || isClaimed) && userProgress && (
                    <div className="challenge-card__progress-section">
                        <div className="progress-info">
                            <span>Tiến độ: {userProgress.currentCount || 0} / {targetCount}</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div className="progress-bar-challenge">
                            <div className="progress-bar-challenge__filled" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                )}

                {/* Nút Hành Động */}
                <div className="challenge-card__actions">
                    {notJoined && isActive && (!endDate || new Date(endDate) > new Date()) && (
                        <button
                            className="btn-custom btn--primary btn--sm"
                            onClick={(e) => { e.stopPropagation(); onJoinChallenge(challenge.id); }}
                            disabled={isJoining || (challenge.requiredLevel && currentUser?.level < challenge.requiredLevel)}
                        >
                            {isJoining ? <span className="spinner--small"></span> : (challenge.requiredLevel && currentUser?.level < challenge.requiredLevel) ? `Cần Cấp ${challenge.requiredLevel}` : 'Tham Gia'}
                        </button>
                    )}
                    {isCompleted && onClaimReward && ( // Nếu có bước nhận thưởng riêng
                        <button
                            className="btn-custom btn--success btn--sm"
                            onClick={(e) => { e.stopPropagation(); onClaimReward(userProgress.id); }}
                            disabled={isClaiming}
                        >
                            {isClaiming ? <span className="spinner--small"></span> : 'Nhận Thưởng'}
                        </button>
                    )}
                    {isClaimed && <span className="status-badge status-claimed"><i className="fas fa-check-circle icon-before-small"></i>Đã nhận thưởng</span>}
                    {isInProgress && <span className="status-badge status-in-progress">Đang thực hiện...</span>}
                    {userProgress?.status === 'FAILED' && <span className="status-badge status-failed">Thất bại / Hết hạn</span>}
                    {(endDate && new Date(endDate) < new Date() && !isCompleted && !isClaimed) && <span className="status-badge status-expired">Đã kết thúc</span>}
                </div>
            </div>
        </div>
    );
};

export default ChallengeCard;