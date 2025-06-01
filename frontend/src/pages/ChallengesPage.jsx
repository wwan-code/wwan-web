// src/pages/ChallengesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import NProgress from 'nprogress';
import { useSelector, useDispatch } from 'react-redux'; // Để lấy currentUser
import classNames from '@utils/classNames';

import ChallengeCard from '@components/Challenges/ChallengeCard'; // Sử dụng alias
import Pagination from '@components/Common/Pagination';
import authHeader from '@services/auth-header';
import { showErrorToast } from '@utils/errorUtils';

// Import SCSS cho trang này
import '@assets/scss/pages/_challenges-page.scss'; // Sử dụng alias

const ITEMS_PER_PAGE_CHALLENGES = 9;

const ChallengesPage = () => {
    const dispatch = useDispatch(); // Nếu cần dispatch action
    const { user: currentUser, isLoggedIn } = useSelector((state) => state.user);

    const [challenges, setChallenges] = useState([]);
    const [pagination, setPagination] = useState({ totalPages: 1, currentPage: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    const currentFilter = searchParams.get('filter') || 'active'; // active, joined, completed

    const [actionState, setActionState] = useState({ // Để quản lý loading cho join/claim
        joiningChallengeId: null,
        claimingProgressId: null,
    });


    const fetchChallenges = useCallback(async (page, filter) => {
        setLoading(true); setError(null); NProgress.start();
        try {
            const params = {
                page,
                limit: ITEMS_PER_PAGE_CHALLENGES,
                filterStatus: filter === 'all' ? undefined : filter, // API backend cần hỗ trợ filter này
            };
            // API `/api/challenges` đã được cập nhật để trả về cả userProgress
            const response = await axios.get('/api/challenges', { params, headers: authHeader() });
            if (response.data?.success) {
                setChallenges(response.data.challenges || []);
                setPagination(response.data.pagination || { totalPages: 1, currentPage: page });
            } else {
                throw new Error(response.data?.message || "Không thể tải danh sách thử thách.");
            }
        } catch (err) {
            showErrorToast(err, "Lỗi tải thử thách");
            setChallenges([]);
        } finally {
            setLoading(false); NProgress.done();
        }
    }, [showErrorToast]); // Thêm showErrorToast nếu nó là callback ổn định

    useEffect(() => {
        fetchChallenges(currentPage, currentFilter);
        document.title = "Thử Thách | WWAN Film";
    }, [currentPage, currentFilter, fetchChallenges]);

    const handlePageChange = (newPage) => {
        setSearchParams({ filter: currentFilter, page: newPage.toString() });
    };

    const handleFilterChange = (newFilter) => {
        setSearchParams({ filter: newFilter, page: '1' });
    };

    const handleJoinChallenge = async (challengeId) => {
        if (!isLoggedIn) { toast.info("Vui lòng đăng nhập để tham gia thử thách."); return; }
        setActionState(prev => ({ ...prev, joiningChallengeId: challengeId }));
        try {
            // API `/api/challenges/:challengeId/join` (đã tạo ở backend)
            const response = await axios.post(`/api/challenges/${challengeId}/join`, {}, { headers: authHeader() });
            if (response.data.success) {
                toast.success(response.data.message || "Đã tham gia thử thách!");
                // Tải lại danh sách để cập nhật userProgress
                fetchChallenges(currentPage, currentFilter);
            } else {
                throw new Error(response.data.message);
            }
        } catch (err) {
            showErrorToast(err, "Lỗi tham gia thử thách");
        } finally {
            setActionState(prev => ({ ...prev, joiningChallengeId: null }));
        }
    };

    const handleClaimReward = async (progressId) => {
        // API `/api/challenges/progress/:progressId/claim` (cần tạo ở backend)
        if (!isLoggedIn) return;
        setActionState(prev => ({ ...prev, claimingProgressId: progressId }));
        try {
            // const response = await axios.post(`/api/challenges/progress/${progressId}/claim`, {}, { headers: authHeader() });
            // if (response.data.success) {
            //     toast.success("Đã nhận thưởng thành công!");
            //     fetchChallenges(currentPage, currentFilter); // Tải lại
            // } else { throw new Error(response.data.message); }
            toast.info("Tính năng nhận thưởng đang được phát triển!"); // Placeholder
        } catch (err) {
            // showErrorToast(err, "Lỗi nhận thưởng");
        } finally {
            setActionState(prev => ({ ...prev, claimingProgressId: null }));
        }
    };


    return (
        <div className="container challenges-page-container py-lg-5 py-4">
            <div className="challenges-page-header">
                <h1 className="challenges-page-title">
                    <i className="fas fa-tasks icon-before"></i> Khám Phá Thử Thách
                </h1>
                <p className="challenges-page-subtitle">
                    Hoàn thành các thử thách để nhận điểm thưởng, huy hiệu và nhiều vật phẩm giá trị!
                </p>
            </div>

            <div className="challenges-filters-bar">
                <button
                    className={classNames("filter-btn", { active: currentFilter === 'active' })}
                    onClick={() => handleFilterChange('active')}
                >
                    Đang diễn ra
                </button>
                {isLoggedIn && ( // Chỉ hiển thị filter này nếu đăng nhập
                    <>
                    <button
                        className={classNames("filter-btn", { active: currentFilter === 'joined' })}
                        onClick={() => handleFilterChange('joined')}
                    >
                        Đã tham gia
                    </button>
                    <button
                        className={classNames("filter-btn", { active: currentFilter === 'completed' })}
                        onClick={() => handleFilterChange('completed')}
                    >
                        Đã hoàn thành
                    </button>
                    </>
                )}
            </div>

            {loading && challenges.length === 0 && (
                <div className="page-loader"><div className="spinner-eff"></div><p>Đang tải thử thách...</p></div>
            )}
            {error && !loading && (
                <div className="alert-message alert-danger text-center">{error}</div>
            )}
            {!loading && !error && challenges.length === 0 && (
                <div className="alert-message alert-info text-center empty-challenges">
                    <i className="fas fa-clipboard-list empty-icon"></i>
                    <p className="empty-text">Hiện không có thử thách nào phù hợp.</p>
                </div>
            )}

            {challenges.length > 0 && (
                <div className="challenges-grid mt-4">
                    {challenges.map(challenge => (
                        <ChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            currentUser={currentUser} // Truyền currentUser để check level
                            onJoinChallenge={handleJoinChallenge}
                            onClaimReward={handleClaimReward}
                            isJoining={actionState.joiningChallengeId === challenge.id}
                            isClaiming={actionState.claimingProgressId === challenge.userProgress?.id}
                        />
                    ))}
                </div>
            )}

            {!loading && pagination && pagination.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    );
};

export default ChallengesPage;