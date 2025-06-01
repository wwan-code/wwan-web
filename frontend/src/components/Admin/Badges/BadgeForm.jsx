// src/components/Admin/Badges/BadgeForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { BADGE_TYPES } from '@hooks/admin/useBadgeManagementLogic';
import { toast } from 'react-toastify';

const initialFormState = {
    name: "", description: "", type: BADGE_TYPES[0]?.value || '',
    criteria: '{}', iconUrl: "", badgeIconFile: null, iconPreview: null,
};

const BadgeForm = ({ initialData, onSave, onDiscard, isSubmitting }) => {
    const [badge, setBadge] = useState(initialFormState);
    const [editingId, setEditingId] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (initialData) {
            setBadge({
                name: initialData.name || "",
                description: initialData.description || "",
                type: initialData.type || BADGE_TYPES[0]?.value,
                criteria: typeof initialData.criteria === 'string' ? initialData.criteria : JSON.stringify(initialData.criteria || {}, null, 2),
                iconUrl: initialData.iconUrl || "", // Đây có thể là URL hoặc class FA
                badgeIconFile: null, // Reset file khi mở form
                iconPreview: initialData.iconUrl && !initialData.iconUrl.startsWith('fa') // Chỉ preview nếu là URL ảnh
                    ? (initialData.iconUrl.startsWith('http') ? initialData.iconUrl : `/${initialData.iconUrl}`)
                    : null,
            });
            setEditingId(initialData.id || null);
        } else {
            setBadge(initialFormState);
            setEditingId(null);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setBadge(prev => ({ ...prev, [name]: value }));
    };

    const handleIconFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setBadge(prev => ({ ...prev, badgeIconFile: file, iconPreview: URL.createObjectURL(file), iconUrl: '' })); // Xóa iconUrl nếu chọn file
        } else {
            if (file) toast.warn("Vui lòng chọn file ảnh.");
        }
    };

    const removeSelectedIcon = () => {
        setBadge(prev => ({
            ...prev,
            badgeIconFile: null,
            iconPreview: null,
            // Nếu đang edit và có iconUrl cũ, không xóa iconUrl ở đây, backend sẽ xử lý removeIcon flag
            iconUrl: editingId && initialData?.iconUrl ? initialData.iconUrl : ''
        }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFormSave = (e) => {
        e.preventDefault();
        // ... (validate name, type, criteria JSON) ...
        onSave(badge, editingId);
    };

    return (
        <div className="admin-form-card">
            <div className="admin-form-card__header">
                <h5 className="admin-form-card__title">{editingId ? "Chỉnh sửa Huy hiệu" : "Tạo Huy hiệu Mới"}</h5>
            </div>
            <div className="admin-form-card__body">
                <form onSubmit={handleFormSave} className="custom-form">
                    <div className="form-group">
                        <label htmlFor="badgeName" className="form-label">Tên huy hiệu <span className="text-danger">*</span></label>
                        <input type="text" id="badgeName" name="name" className="form-control" value={badge.name} onChange={handleChange} required disabled={isSubmitting} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="badgeDescription" className="form-label">Mô tả <span className="text-danger">*</span></label>
                        <textarea id="badgeDescription" name="description" className="form-control" value={badge.description} onChange={handleChange} rows="2" required disabled={isSubmitting}></textarea>
                    </div>
                    <div className="form-row-grid">
                        <div className="form-group">
                            <label htmlFor="badgeType" className="form-label">Loại huy hiệu <span className="text-danger">*</span></label>
                            <select id="badgeType" name="type" className="form-select" value={badge.type} onChange={handleChange} required disabled={isSubmitting}>
                                {BADGE_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="badgeIconUrl" className="form-label">Icon (URL/Class FA hoặc Upload)</label>
                            <input type="text" id="badgeIconUrl" name="iconUrl" className="form-control" value={badge.iconUrl} onChange={handleChange} placeholder="VD: fas fa-star hoặc /assets/icons/badge.png" disabled={isSubmitting || !!badge.badgeIconFile} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="badgeIconFile" className="form-label">Hoặc Upload Icon Mới</label>
                        {badge.iconPreview && (
                            <div className="image-preview-container mb-2">
                                <img src={badge.iconPreview} alt="Xem trước icon" className="image-preview-profile" style={{width: '64px', height: '64px'}} />
                                <button type="button" className="btn-remove-preview" onClick={removeSelectedIcon} title="Xóa icon đã chọn/hiện tại" disabled={isSubmitting}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        )}
                        <input type="file" id="badgeIconFile" ref={fileInputRef} className="form-control form-control-sm" accept="image/*" onChange={handleIconFileChange} disabled={isSubmitting} />
                        {badge.badgeIconFile && <small className="form-text text-muted">Đã chọn: {badge.badgeIconFile.name}</small>}
                         {badge.iconUrl && !badge.badgeIconFile && <small className="form-text text-muted">Đang dùng: {badge.iconUrl}</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="badgeCriteria" className="form-label">Điều kiện nhận (JSON) <span className="text-danger">*</span></label>
                        <textarea id="badgeCriteria" name="criteria" className="form-control" value={badge.criteria} onChange={handleChange} rows="3" required placeholder='VD: {"eventName": "watch_movies", "count": 10, "genreId": 1}' disabled={isSubmitting}></textarea>
                    </div>
                    <div className="form-actions mt-3">
                        {editingId && <button type="button" className="btn-custom btn--secondary me-2" onClick={onDiscard} disabled={isSubmitting}>Hủy</button>}
                        <button type="submit" className="btn-custom btn--primary" disabled={isSubmitting}>
                            {isSubmitting ? <span className="spinner--small"></span> : (editingId ? 'Cập nhật Huy hiệu' : 'Thêm Huy hiệu')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default BadgeForm;