// src/pages/UserProfilePage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import classNames from '@utils/classNames';
import authHeader from '@services/auth-header';
import UserAvatarDisplay from '@components/Common/UserAvatarDisplay';
import '@assets/scss/pages/_user-profile-page.scss';
import ProfileHeader from '@components/Profile/ProfileHeader';
import TimelineSection from '@components/Profile/TimelineSection';

const LEVEL_THRESHOLDS_PUBLIC = [
    { level: 1, points: 0 }, { level: 2, points: 100 }, { level: 3, points: 300 },
    { level: 4, points: 600 }, { level: 5, points: 1000 }, { level: 6, points: 1500 },
    { level: 7, points: 2100 }, { level: 8, points: 2800 }, { level: 9, points: 3600 },
    { level: 10, points: 4500 }, { level: 11, points: 5500 }, { level: 12, points: 6600 },
    { level: 13, points: 7800 }, { level: 14, points: 9100 }, { level: 15, points: 10500 },
    { level: 16, points: 12000 }, { level: 17, points: 13600 }, { level: 18, points: 15300 },
    { level: 19, points: 17100 }, { level: 20, points: 19000 }
];

const UserProfilePage = () => {
    const { uuid } = useParams();
    const navigate = useNavigate();

    const { user: currentUser, isLoggedIn } = useSelector((state) => state.user);

    const [profileUser, setProfileUser] = useState(null);
    const [userBadges, setUserBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileTimeline, setProfileTimeline] = useState([]);
    const [profileFriends, setProfileFriends] = useState([]);
    const [loadingExtra, setLoadingExtra] = useState(false);

    const calculateProgress = useCallback(() => {
        if (!profileUser || typeof profileUser.points !== 'number' || typeof profileUser.level !== 'number') {
            return { levelProgress: 0, pointsProgress: 0, nextLevelPoints: 100, currentLevelPoints: 0 };
        }

        const currentLevelInfo = LEVEL_THRESHOLDS_PUBLIC.find(lt => lt.level === profileUser.level);
        const nextLevelInfo = LEVEL_THRESHOLDS_PUBLIC.find(lt => lt.level === profileUser.level + 1);

        const currentLevelPoints = currentLevelInfo ? currentLevelInfo.points : 0;
        const nextLevelPoints = nextLevelInfo ? nextLevelInfo.points : (currentLevelPoints + (LEVEL_THRESHOLDS_PUBLIC[1]?.points || 100));

        return {
            nextLevelPoints
        };
    }, [profileUser]);

    const { nextLevelPoints } = calculateProgress();

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!uuid) { setError("Không tìm thấy UUID người dùng."); setLoading(false); return; }
            if (isLoggedIn && currentUser?.uuid === uuid) { navigate('/profile', { replace: true }); return; }

            setLoading(true); setError(null);
            try {
                const response = await axios.get(`/api/profile-user/${uuid}`, { headers: authHeader() });
                if (response.data.success) {
                    setProfileUser(response.data.user);
                    document.title = `${response.data.user.name} | WWAN Film`;
                    const badgesResponse = await axios.get(`/api/users/${uuid}/badges`, { headers: authHeader() });
                    if (badgesResponse.data.success) setUserBadges(badgesResponse.data.badges || []);
                } else { throw new Error(response.data.message || "Không tìm thấy người dùng."); }
            } catch (err) {
                console.error("Lỗi tải trang cá nhân người dùng:", err);
                setError(err.response?.data?.message || err.message || "Lỗi tải thông tin người dùng.");
            } finally { setLoading(false); }
        };
        fetchProfileData();
    }, [uuid, isLoggedIn, currentUser, navigate]);

    useEffect(() => {
        const fetchExtraData = async () => {
            if (profileUser && profileUser.id) {
                setLoadingExtra(true);
                const promises = [];
                if (profileUser.canViewFriends) {
                    promises.push(axios.get(`/api/friends/${profileUser.id}`, { headers: authHeader() }));
                } else {
                    promises.push(Promise.resolve({ data: { success: true, data: { friends: [] } } })); // Trả về mảng rỗng nếu không được xem
                }

                if (profileUser.canViewTimeline) {
                    promises.push(axios.get(`/api/auth/timeline/${profileUser.uuid}`, { headers: authHeader() }));
                } else {
                    promises.push(Promise.resolve({ data: [] }));
                }

                try {
                    const [friendsRes, timelineRes] = await Promise.all(promises);
                    if (friendsRes.data?.success) {
                        setProfileFriends(friendsRes.data.data?.friends || []);
                    }
                    setProfileTimeline(timelineRes.data || []);

                } catch (err) {
                    console.error("Lỗi tải thêm thông tin profile:", err);
                } finally {
                    setLoadingExtra(false);
                }
            }
        };

        if (profileUser?.canViewFriends !== undefined || profileUser?.canViewTimeline !== undefined) {
            fetchExtraData();
        }

    }, [profileUser]);

    if (loading) {
        return (
            <div className="loader-overlay">
                <div id="container-loader">
                    <div className="loader-box" id="loader1"></div>
                    <div className="loader-box" id="loader2"></div>
                    <div className="loader-box" id="loader3"></div>
                    <div className="loader-box" id="loader4"></div>
                    <div className="loader-box" id="loader5"></div>
                </div>
            </div>
        )
    }
    if (error) {
        return (
            <div className="alert-message alert-danger" style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'var(--w-danger-bg-subtle)', color: 'var(--w-danger-text-emphasis)', border: '1px solid var(--w-danger-border-subtle)' }}>Lỗi: {error}</div>
        )

    }
    if (!profileUser) {
        return (
            <div className="user-profile-loading">
                <h4>Loading user profile...</h4>
            </div>
        );
    }

    return (
        <div className={`profile-page-wrapper`}>
            <div className="container profile-page-container py-4">
                <div className="main-body">
                    <div className="row">
                        <div className="col-md-4">
                            <ProfileHeader profileUser={profileUser} />
                            <div className="profile-section-card card-profile mt-3">
                                <h5 className="section-title-profile">
                                    <i className="fas fa-trophy text-info icon-before"></i>Thành Tích
                                </h5>
                                <div className="az3">
                                    <small>Cấp độ: {profileUser.level} ({profileUser.points} / {nextLevelPoints})</small>
                                    <div className="progress mb-1" style={{ height: '10px' }}>
                                        <div
                                            className="progress-bar progress-bar-wave"
                                            role="progressbar"
                                            style={{ width: `${(profileUser.points / nextLevelPoints) * 100}%` }}
                                            aria-valuenow={profileUser.points}
                                            aria-valuemin="0"
                                            aria-valuemax={nextLevelPoints}
                                        >
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="profile-section-card card-profile mt-3" id="badges">
                                <h5 className="section-title-profile">
                                    <i className="fas fa-medal text-warning icon-before"></i>Huy Hiệu
                                </h5>
                                <div className="profile-section-card__content">
                                    {userBadges.length > 0 ? (
                                        <div className="row g-2">
                                            {userBadges.map(badge => (
                                                <div key={badge.id} className="col-4 col-md-6 text-center mb-2">
                                                    {badge.iconUrl ? (
                                                        <i className={badge.iconUrl}></i>
                                                    ) : (
                                                        <div className="avatar avatar-md" title={`${badge.name}: ${badge.description}`}>
                                                            <span className="avatar-initial rounded-circle bg-secondary">
                                                                <i className="fas fa-medal"></i>
                                                            </span>
                                                        </div>
                                                    )}
                                                    <small className="d-block text-muted mt-1 text-truncate" title={badge.name}>{badge.name}</small>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted text-center small">Chưa có huy hiệu nào.</p>
                                    )}
                                </div>
                            </div>
                            {profileUser.canViewFriends ? (
                                <div className="profile-section-card card-profile mt-3 profile-friends-card-public">
                                    <h5 className="section-title-profile">
                                        <i className="fas fa-user-friends icon-before"></i>Bạn bè
                                    </h5>
                                    <div className="profile-section-card__content">
                                        {loadingExtra ? (
                                            <div className="text-center"><span className="spinner--small"></span></div>
                                        ) : profileFriends.length > 0 ? (
                                            <div className="row no-gutters row-bordered">
                                                {profileFriends.slice(0, 12).map(friend => (
                                                    <Link key={friend.id} className="position-relative d-flex col-4 col-sm-3 col-md-4 flex-column align-items-center text-body py-3 px-2" title={friend.name} to={`/profile/${friend.uuid}`}>
                                                            <UserAvatarDisplay userToDisplay={friend} size="48" />
                                                            <small className="text-center">{friend.name}</small>
                                                    </Link>
                                                ))}
                                                {profileFriends.length > 12 && <li className="friend-item-profile-more">...</li>}
                                            </div>
                                        ) : (
                                            <p className="text-muted text-center small">Chưa có bạn bè nào.</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="profile-section-card card-profile mt-3">
                                    <h5 className="section-title-profile">
                                        <i className="fas fa-user-friends icon-before"></i>Bạn bè
                                    </h5>
                                    <div className="profile-section-card__content">
                                        <p className="text-muted text-center small"><strong>{profileUser.name}</strong> đã ẩn danh sách bạn bè của họ.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="col-md-8">
                            {profileUser.canViewTimeline ? (
                                <div className="profile-section-card card-profile">
                                    <TimelineSection timeline={profileTimeline} loading={loadingExtra} isPublicView={true} />
                                </div>
                            ) : (
                                <div className="profile-section-card card-profile mt-3">
                                    <h5 className="section-title-profile">
                                        <i className="fas fa-history icon-before"></i>Hoạt Động Gần Đây
                                    </h5>
                                    <div className="profile-section-card__content">
                                        <p className="text-muted text-center small"><strong>{profileUser.name}</strong> đã ẩn hoạt động của họ.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;