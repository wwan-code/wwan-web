import { Link } from "react-router-dom";
import logo from "@assets/images/wwan-logo-text.png";

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer__container">
                {/* Phần đầu của footer: Logo, Giới thiệu, Mạng xã hội */}
                <div className="footer__top">
                    <div className="footer__identity">
                        <Link to={'/'} className="footer__logo">
                            <img src={logo} alt="WWAN Logo" />
                        </Link>
                        <p className="footer__about">
                            Khám phá thế giới truyện tranh và phim ảnh không giới hạn. Cập nhật liên tục những bộ truyện và phim mới nhất.
                        </p>
                    </div>
                    <div className="footer__social">
                        {/* Các icon SVG vẫn được giữ nguyên như file gốc của bạn */}
                        <a href="#" className="footer__social-link" aria-label="Twitter">
                            <svg viewBox="0 0 24 24" width="1.8em" height="1.8em">
                                {/* SVG content for Twitter */}
                            </svg>
                        </a>
                        <a href="#" className="footer__social-link" aria-label="Instagram">
                             <svg viewBox="0 0 24 24" width="1.8em" height="1.8em" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {/* SVG content for Instagram */}
                            </svg>
                        </a>
                        <a href="#" className="footer__social-link" aria-label="Facebook">
                            <svg viewBox="0 0 24 24" width="1.8em" height="1.8em">
                                {/* SVG content for Facebook */}
                            </svg>
                        </a>
                        <a href="#" className="footer__social-link" aria-label="Telegram">
                            <svg viewBox="0 0 24 24" width="1.8em" height="1.8em">
                                {/* SVG content for Telegram */}
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Phần nội dung chính: Các cột liên kết */}
                <div className="footer__main">
                    <div className="footer__links">
                        <h4 className="footer__links-title">Khám phá</h4>
                        <ul className="footer__links-list">
                            <li className="footer__links-item"><Link to="/phim-moi" className="footer__links-link">Phim Mới</Link></li>
                            <li className="footer__links-item"><Link to="/truyen-hot" className="footer__links-link">Truyện Hot</Link></li>
                            <li className="footer__links-item"><Link to="/the-loai" className="footer__links-link">Thể Loại</Link></li>
                        </ul>
                    </div>
                    <div className="footer__links">
                        <h4 className="footer__links-title">Tài khoản</h4>
                        <ul className="footer__links-list">
                            <li className="footer__links-item"><Link to="/tai-khoan" className="footer__links-link">Tài khoản của tôi</Link></li>
                            <li className="footer__links-item"><Link to="/lich-su" className="footer__links-link">Lịch sử xem</Link></li>
                            <li className="footer__links-item"><Link to="/danh-sach-theo-doi" className="footer__links-link">Danh sách theo dõi</Link></li>
                        </ul>
                    </div>
                    <div className="footer__links">
                        <h4 className="footer__links-title">Pháp lý</h4>
                        <ul className="footer__links-list">
                            <li className="footer__links-item"><Link to="/dieu-khoan" className="footer__links-link">Điều khoản</Link></li>
                            <li className="footer__links-item"><Link to="/chinh-sach-bao-mat" className="footer__links-link">Chính sách bảo mật</Link></li>
                            <li className="footer__links-item"><Link to="/lien-he" className="footer__links-link">Liên hệ</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Đường kẻ ngang phân cách */}
                <hr className="footer__divider" />

                {/* Phần chân footer: Copyright */}
                <div className="footer__bottom">
                    <p className="footer__copyright">© 2025 WWAN. Tất cả các quyền được bảo lưu.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;