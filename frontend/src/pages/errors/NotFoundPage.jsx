import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@assets/scss/pages/_error-pages.scss';
import notFoundImage from '@assets/images/err404.png';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="error-page-container">
            <div className="error-content">
                <div className="error-image-container">
                    <img src={notFoundImage} alt="404 Not Found" className="error-image" />
                </div>
                <div className="error-text-content">
                    <h1 className="error-title">404 - Lạc Lối Rồi!</h1>
                    <p className="error-description">
                        Trang bạn đang tìm kiếm dường như đã bị thất lạc giữa kho lưu trữ phim và truyện tranh vô tận của chúng tôi. Có lẽ nó đã bị chuyển đi hoặc không bao giờ tồn tại.
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

export default NotFoundPage;