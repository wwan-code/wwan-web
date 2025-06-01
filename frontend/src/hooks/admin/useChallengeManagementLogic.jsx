// src/hooks/admin/useChallengeManagementLogic.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import authHeader from '@services/auth-header'; // Sử dụng alias
import useTableData from '@hooks/useTableData';   // Sử dụng alias
import { generateSlug } from '@utils/slugUtils';

const API_URL = '/api/admin/challenges'; // API endpoint cho admin quản lý challenges

// Định nghĩa các loại thử thách (đồng bộ với backend Challenge model)
export const CHALLENGE_TYPES = [
    { value: 'WATCH_X_MOVIES', label: 'Xem X Phim' },
    { value: 'WATCH_X_EPISODES', label: 'Xem X Tập Phim' },
    { value: 'WATCH_GENRE_MOVIES', label: 'Xem Phim Theo Thể Loại' },
    // { value: 'WATCH_CATEGORY_MOVIES', label: 'Xem Phim Theo Danh Mục' },
    // { value: 'COMPLETE_MOVIE', label: 'Hoàn Thành 1 Phim (Xem hết tập)' },
    // { value: 'COMPLETE_SERIES', label: 'Hoàn Thành 1 Series Phim' },
    { value: 'RATE_X_MOVIES', label: 'Đánh Giá X Phim' },
    { value: 'READ_X_COMICS', label: 'Đọc X Truyện' },
    { value: 'READ_X_CHAPTERS', label: 'Đọc X Chương Truyện' },
    // { value: 'READ_GENRE_COMICS', label: 'Đọc Truyện Theo Thể Loại' },
    // { value: 'COMPLETE_COMIC', label: 'Hoàn Thành 1 Truyện (Đọc hết chương)' },
    { value: 'DAILY_LOGIN_STREAK', label: 'Chuỗi Đăng Nhập Hàng Ngày' },
    // { value: 'ADD_X_FRIENDS', label: 'Kết Bạn Với X Người' },
    // { value: 'CREATE_X_COLLECTIONS', label: 'Tạo X Bộ Sưu Tập' },
];

const useChallengeManagementLogic = () => {
    const [challenges, setChallenges] = useState([]);
    const [editingChallenge, setEditingChallenge] = useState(null); // Dữ liệu của challenge đang sửa
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho các dropdown phụ trợ (genres, badges, shop items)
    const [badges, setBadges] = useState([]);
    const [shopItems, setShopItems] = useState([]);
    // (Bạn có thể thêm genres, categories nếu criteria cần chọn từ đó)

    const {
        data: displayedData,
        totalPages,
        currentPage,
        searchTerm,
        handleSearch,
        requestSort,
        goToPage,
        sortConfig,
        itemsPerPage,
        handleItemsPerPageChange,
        totalEntries,
        filteredEntries,
        startEntry,
        endEntry,
    } = useTableData(challenges, 10);

    const fetchAuxiliaryData = useCallback(async () => {
        try {
            const [badgesRes, shopItemsRes] = await Promise.all([
                axios.get('/api/admin/badges', { headers: authHeader() }), // API lấy danh sách huy hiệu
                axios.get('/api/shop/items?adminView=true', { headers: authHeader() }) // API lấy danh sách shop items (có thể cần param adminView)
            ]);
            if (badgesRes.data?.success) setBadges(badgesRes.data.badges || []);
            if (shopItemsRes.data?.success) setShopItems(shopItemsRes.data.items || []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu phụ trợ cho thử thách:", error);
            toast.error("Không thể tải dữ liệu huy hiệu/vật phẩm.");
        }
    }, []);


    const fetchChallenges = useCallback(async () => {
        setIsDataLoading(true);
        try {
            const response = await axios.get('/api/challenges', { headers: authHeader() });
            setChallenges(response.data.challenges || []);
        } catch (error) {
            console.error("Lỗi tải thử thách:", error);
            toast.error("Không thể tải danh sách thử thách.");
            setChallenges([]);
        } finally {
            setIsDataLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChallenges();
        fetchAuxiliaryData(); // Tải dữ liệu phụ trợ khi component mount
    }, [fetchChallenges, fetchAuxiliaryData]);

    const handleApiError = (error, operation = "thực hiện") => {
        console.error(`Lỗi ${operation} thử thách:`, error);
        const message = error.response?.data?.message || error.message || `Không thể ${operation} thử thách.`;
        toast.error(message);
    };

    const handleSaveChallenge = async (challengeData, editingId) => {
        setIsSubmitting(true);
        // Chuẩn hóa dữ liệu trước khi gửi
        const dataToSend = {
            ...challengeData,
            slug: challengeData.slug || generateSlug(challengeData.title || ''), // Tạo slug nếu chưa có
            targetCount: parseInt(challengeData.targetCount, 10) || 1,
            pointsReward: parseInt(challengeData.pointsReward, 10) || 0,
            badgeIdReward: challengeData.badgeIdReward || null,
            shopItemIdReward: challengeData.shopItemIdReward || null,
            startDate: challengeData.startDate || null,
            endDate: challengeData.endDate || null,
            durationForUserDays: challengeData.durationForUserDays ? parseInt(challengeData.durationForUserDays, 10) : null,
            isActive: !!challengeData.isActive,
            isRepeatable: !!challengeData.isRepeatable,
            repeatIntervalDays: challengeData.isRepeatable && challengeData.repeatIntervalDays ? parseInt(challengeData.repeatIntervalDays, 10) : null,
            requiredLevel: parseInt(challengeData.requiredLevel, 10) || 1,
            criteria: challengeData.criteria ? (typeof challengeData.criteria === 'string' ? JSON.parse(challengeData.criteria) : challengeData.criteria) : {},
        };

        // Xóa các trường null/undefined không cần thiết để tránh lỗi validate ở backend
        Object.keys(dataToSend).forEach(key => {
            if (dataToSend[key] === null || dataToSend[key] === undefined || dataToSend[key] === '') {
                if (key !== 'badgeIdReward' && key !== 'shopItemIdReward' && key !== 'startDate' && key !== 'endDate' && key !== 'durationForUserDays' && key !== 'repeatIntervalDays' && key !== 'coverImageUrl') {
                    // Giữ lại các trường có thể null
                } else if (dataToSend[key] === '') {
                     // Chuyển chuỗi rỗng thành null cho các trường này
                     dataToSend[key] = null;
                }
            }
        });


        try {
            const url = editingId ? `${API_URL}/${editingId}` : API_URL;
            const method = editingId ? "put" : "post";
            const response = await axios[method](url, dataToSend, { headers: authHeader() });

            if (response.data.success) {
                toast.success(editingId ? "Cập nhật thử thách thành công." : "Thêm thử thách mới thành công.");
                await fetchChallenges();
                setEditingChallenge(null);
            } else {
                throw new Error(response.data.message || "Thao tác thất bại.");
            }
        } catch (error) {
            handleApiError(error, editingId ? "cập nhật" : "lưu");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteChallenge = async (challengeId) => {
        if (!challengeId || !window.confirm("Bạn chắc chắn muốn xóa thử thách này?")) return;
        setIsSubmitting(true); // Có thể dùng state loading riêng cho delete
        try {
            const response = await axios.delete(`${API_URL}/${challengeId}`, { headers: authHeader() });
            if (response.data.success) {
                toast.success("Đã xóa thử thách thành công.");
                await fetchChallenges();
                if (editingChallenge?.id === challengeId) {
                    setEditingChallenge(null);
                }
            } else {
                throw new Error(response.data.message || "Xóa thử thách thất bại.");
            }
        } catch (error) {
            handleApiError(error, "xóa");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditChallenge = useCallback(async (challengeId) => {
        setIsDataLoading(true); // Hoặc một state loading riêng cho edit form
        try {
            const response = await axios.get(`${API_URL}/${challengeId}`, { headers: authHeader() });
            if (response.data.success && response.data.challenge) {
                const fetchedChallenge = response.data.challenge;
                setEditingChallenge({
                    ...fetchedChallenge,
                    criteria: fetchedChallenge.criteria ? JSON.stringify(fetchedChallenge.criteria, null, 2) : '{}',
                    startDate: fetchedChallenge.startDate ? fetchedChallenge.startDate.split('T')[0] : '',
                    endDate: fetchedChallenge.endDate ? fetchedChallenge.endDate.split('T')[0] : '',
                    durationForUserDays: fetchedChallenge.durationForUserDays || '',
                    repeatIntervalDays: fetchedChallenge.repeatIntervalDays || '',
                    coverImageUrl: fetchedChallenge.coverImageUrl || '',
                    badgeIdReward: fetchedChallenge.badgeIdReward || '',
                    shopItemIdReward: fetchedChallenge.shopItemIdReward || '',
                });
            } else {
                toast.error("Không thể tải chi tiết thử thách để sửa.");
            }
        } catch (error) {
            handleApiError(error, "tải chi tiết thử thách");
        } finally {
            setIsDataLoading(false);
        }
    }, []);

    const handleDiscardEdit = () => {
        setEditingChallenge(null);
        toast.info("Đã hủy bỏ thay đổi.");
    };

    return {
        editingChallenge,
        isDataLoading,
        isSubmitting,
        handleSaveChallenge,
        handleDeleteChallenge,
        handleEditChallenge,
        handleDiscardEdit,
        // Dữ liệu cho bảng
        displayedData,
        totalPages,
        currentPage,
        searchTerm,
        handleSearch,
        requestSort,
        goToPage,
        sortConfig,
        itemsPerPage,
        handleItemsPerPageChange,
        // Dữ liệu phụ trợ cho form
        badges,
        shopItems,
    };
};

export default useChallengeManagementLogic;