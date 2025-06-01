// src/components/Admin/Challenges/ChallengeForm.jsx
import React, { useState, useEffect } from 'react';
import { CHALLENGE_TYPES } from '@hooks/admin/useChallengeManagementLogic';
import { toast } from 'react-toastify';

const initialFormState = {
    title: "", slug: "", description: "", type: CHALLENGE_TYPES[0]?.value || '',
    targetCount: 1, criteria: '{}',
    pointsReward: 0, badgeIdReward: '', shopItemIdReward: '',
    startDate: '', endDate: '', durationForUserDays: '',
    isActive: true, isRepeatable: false, repeatIntervalDays: '',
    requiredLevel: 1, coverImageUrl: '',
};

const ChallengeForm = ({ initialData, onSave, onDiscard, isSubmitting, badges = [], shopItems = [] }) => {
    const [challenge, setChallenge] = useState(initialFormState);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        if (initialData) {
            setChallenge({
                title: initialData.title || "",
                slug: initialData.slug || "",
                description: initialData.description || "",
                type: initialData.type || CHALLENGE_TYPES[0]?.value,
                targetCount: initialData.targetCount || 1,
                criteria: typeof initialData.criteria === 'string' ? initialData.criteria : JSON.stringify(initialData.criteria || {}, null, 2),
                pointsReward: initialData.pointsReward || 0,
                badgeIdReward: initialData.badgeIdReward || '',
                shopItemIdReward: initialData.shopItemIdReward || '',
                startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
                endDate: initialData.endDate ? initialData.endDate.split('T')[0] : '',
                durationForUserDays: initialData.durationForUserDays || '',
                isActive: initialData.isActive === undefined ? true : !!initialData.isActive,
                isRepeatable: !!initialData.isRepeatable,
                repeatIntervalDays: initialData.repeatIntervalDays || '',
                requiredLevel: initialData.requiredLevel || 1,
                coverImageUrl: initialData.coverImageUrl || '',
            });
            setEditingId(initialData.id || null);
        } else {
            setChallenge(initialFormState);
            setEditingId(null);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setChallenge(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFormSave = (e) => {
        e.preventDefault();
        if (!challenge.title.trim() || !challenge.type.trim()) {
            toast.warn("Tên, loại thử thách là bắt buộc."); return;
        }
        try {
            // Validate JSON criteria if not empty
            if (challenge.criteria.trim() !== "" && challenge.criteria.trim() !== "{}") {
                JSON.parse(challenge.criteria);
            }
        } catch (jsonError) {
            toast.error("Tiêu chí (Criteria) không phải là JSON hợp lệ."); return;
        }
        onSave(challenge, editingId);
    };

    return (
        <div className="admin-form-card"> {/* Class chung cho card form admin */}
            <div className="admin-form-card__header">
                <h5 className="admin-form-card__title">
                    {editingId ? "Chỉnh sửa Thử Thách" : "Tạo Thử Thách Mới"}
                </h5>
            </div>
            <div className="admin-form-card__body">
                <form onSubmit={handleFormSave} className="custom-form">
                    <div className="form-row-grid">
                        <div className="form-group">
                            <label htmlFor="challengeTitle" className="form-label">Tên thử thách <span className="text-danger">*</span></label>
                            <input type="text" id="challengeTitle" name="title" className="form-control" value={challenge.title} onChange={handleChange} required disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="challengeSlug" className="form-label">Slug (tự động nếu trống)</label>
                            <input type="text" id="challengeSlug" name="slug" className="form-control" value={challenge.slug} onChange={handleChange} placeholder="vd: marathon-phim-kinh-di" disabled={isSubmitting} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="challengeDescription" className="form-label">Mô tả <span className="text-danger">*</span></label>
                        <textarea id="challengeDescription" name="description" className="form-control" value={challenge.description} onChange={handleChange} rows="3" required disabled={isSubmitting}></textarea>
                    </div>

                    <div className="form-row-grid">
                        <div className="form-group">
                            <label htmlFor="challengeType" className="form-label">Loại thử thách <span className="text-danger">*</span></label>
                            <select id="challengeType" name="type" className="form-select" value={challenge.type} onChange={handleChange} required disabled={isSubmitting}>
                                {CHALLENGE_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="challengeTargetCount" className="form-label">Mục tiêu (Số lượng) <span className="text-danger">*</span></label>
                            <input type="number" id="challengeTargetCount" name="targetCount" className="form-control" value={challenge.targetCount} onChange={handleChange} required min="1" disabled={isSubmitting} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="challengeCriteria" className="form-label">Tiêu chí (JSON object)</label>
                        <textarea id="challengeCriteria" name="criteria" className="form-control" value={challenge.criteria} onChange={handleChange} rows="4" placeholder='Ví dụ: {"genreIds": [1,5], "minRating": 3}' disabled={isSubmitting}></textarea>
                        <small className="form-text text-muted">
                            Ví dụ: <code>{`{"genreIds":[1,2], "specificMovieIds":[10,12]}`}</code> hoặc để trống nếu không có.
                        </small>
                    </div>

                    <h6 className="form-section-title">Phần thưởng</h6>
                    <div className="form-row-grid">
                        <div className="form-group">
                            <label htmlFor="challengePointsReward" className="form-label">Điểm thưởng</label>
                            <input type="number" id="challengePointsReward" name="pointsReward" className="form-control" value={challenge.pointsReward} onChange={handleChange} min="0" disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="challengeBadgeIdReward" className="form-label">Huy hiệu thưởng</label>
                            <select id="challengeBadgeIdReward" name="badgeIdReward" className="form-select" value={challenge.badgeIdReward} onChange={handleChange} disabled={isSubmitting}>
                                <option value="">Không có huy hiệu</option>
                                {badges.map(badge => <option key={badge.id} value={badge.id}>{badge.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="challengeShopItemIdReward" className="form-label">Vật phẩm thưởng</label>
                            <select id="challengeShopItemIdReward" name="shopItemIdReward" className="form-select" value={challenge.shopItemIdReward} onChange={handleChange} disabled={isSubmitting}>
                                <option value="">Không có vật phẩm</option>
                                {shopItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.type})</option>)}
                            </select>
                        </div>
                    </div>

                    <h6 className="form-section-title">Thời gian & Điều kiện</h6>
                     <div className="form-row-grid">
                        <div className="form-group">
                            <label htmlFor="challengeStartDate" className="form-label">Ngày bắt đầu (chung)</label>
                            <input type="date" id="challengeStartDate" name="startDate" className="form-control" value={challenge.startDate} onChange={handleChange} disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="challengeEndDate" className="form-label">Ngày kết thúc (chung)</label>
                            <input type="date" id="challengeEndDate" name="endDate" className="form-control" value={challenge.endDate} onChange={handleChange} disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="challengeDurationForUserDays" className="form-label">Thời hạn cho User (ngày)</label>
                            <input type="number" id="challengeDurationForUserDays" name="durationForUserDays" className="form-control" value={challenge.durationForUserDays} onChange={handleChange} placeholder="Sau khi user tham gia" min="1" disabled={isSubmitting} />
                        </div>
                    </div>
                     <div className="form-row-grid">
                        <div className="form-group">
                            <label htmlFor="challengeRequiredLevel" className="form-label">Cấp độ yêu cầu</label>
                            <input type="number" id="challengeRequiredLevel" name="requiredLevel" className="form-control" value={challenge.requiredLevel} onChange={handleChange} min="1" disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="challengeCoverImageUrl" className="form-label">URL Ảnh bìa thử thách</label>
                            <input type="text" id="challengeCoverImageUrl" name="coverImageUrl" className="form-control" value={challenge.coverImageUrl} onChange={handleChange} placeholder="Đường dẫn ảnh" disabled={isSubmitting} />
                        </div>
                    </div>
                    <div className="form-row-grid two-thirds-one-third"> {/* Grid tùy chỉnh cho checkbox */}
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" role="switch" id="challengeIsActive" name="isActive" checked={challenge.isActive} onChange={handleChange} disabled={isSubmitting} />
                            <label className="form-check-label" htmlFor="challengeIsActive">Kích hoạt thử thách</label>
                        </div>
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" role="switch" id="challengeIsRepeatable" name="isRepeatable" checked={challenge.isRepeatable} onChange={handleChange} disabled={isSubmitting} />
                            <label className="form-check-label" htmlFor="challengeIsRepeatable">Cho phép lặp lại</label>
                        </div>
                    </div>
                    {challenge.isRepeatable && (
                        <div className="form-group mt-2">
                            <label htmlFor="challengeRepeatIntervalDays" className="form-label">Lặp lại sau (ngày)</label>
                            <input type="number" id="challengeRepeatIntervalDays" name="repeatIntervalDays" className="form-control" value={challenge.repeatIntervalDays} onChange={handleChange} min="1" disabled={isSubmitting || !challenge.isRepeatable} />
                        </div>
                    )}

                    <div className="form-actions mt-3">
                        {editingId && (
                            <button type="button" className="btn-custom btn--secondary me-2" onClick={onDiscard} disabled={isSubmitting}>
                                Hủy
                            </button>
                        )}
                        <button type="submit" className="btn-custom btn--primary" disabled={isSubmitting}>
                            {isSubmitting ? <span className="spinner--small"></span> : (editingId ? 'Cập nhật Thử Thách' : 'Thêm Thử Thách')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChallengeForm;