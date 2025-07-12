import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@assets/scss/pages/_error-pages.scss';
import unauthorizedImage from '@assets/images/err403.png';
// Thay thế bằng đường dẫn hình ảnh bạn đã lưu

const UnauthorizedPage = () => {
    const navigate = useNavigate();

    return (
        <div className="error-page-container">
            <div className="error-content">
                <div className="error-image-container">
                    <img src={unauthorizedImage} alt="403 Unauthorized" className="error-image" />
                </div>
                <div className="error-text-content">
                    <h1 className="error-title">403 - Truy Cập Bị Chặn</h1>
                    <p className="error-description">
                        Rất tiếc, bạn không có quyền truy cập vào khu vực này. Cánh cổng đã bị khóa và chỉ những người được cấp phép mới có thể đi qua.
                    </p>
                    <div className="error-actions">
                        <button onClick={() => navigate(-1)} className="error-button secondary">
                            Quay Lại
                        </button>
                        <Link to="/" className="error-button primary">
                            Về Trang Chủ
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;