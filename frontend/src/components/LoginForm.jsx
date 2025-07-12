import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginUser } from '@features/userSlice';
import { useNavigate } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaLock, FaEnvelope, FaUserAstronaut, FaFacebookF, FaGoogle, FaGithub } from 'react-icons/fa';

const LoginForm = ({ onSocialLogin, onSwitchForm }) => {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        const remember = document.getElementById('remember').checked;
        dispatch(loginUser(formData))
            .unwrap()
            .then((response) => {
                if (remember) {
                    localStorage.setItem('remember', JSON.stringify(formData));
                } else {
                    localStorage.removeItem('remember');
                }
                navigate('/');
            })
            .catch((err) => {
                console.log(err);
                toast.warn(err.message, {
                    position: "top-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: document.documentElement.getAttribute("data-ww-theme"),
                    transition: Bounce,
                })
            });
    };

    return (
        <div className="form-container">
            <div className="text-center mb-4">
                <FaUserAstronaut className="icon-xl" style={{ fontSize: '3rem', color: 'var(--w-space-tertiary)' }} />
            </div>

            <h1>Đăng nhập</h1>

            <form onSubmit={handleLogin}>
                <div className='form-group'>
                    <label htmlFor="email" className='form-label'>
                        <FaEnvelope className="me-2" /> Email
                    </label>
                    <div className="input-with-icon">
                        <input
                            type="email"
                            placeholder="Nhập địa chỉ email"
                            className='form-control'
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>

                <div className='form-group'>
                    <label htmlFor="password" className='form-label'>
                        <FaLock className="me-2" /> Mật khẩu
                    </label>
                    <div className="input-with-icon">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="********"
                            className='form-control'
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <span
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>
                </div>

                <div className='form-group d-flex justify-content-between align-items-center'>
                    <div className="form-check">
                        <input type="checkbox" className='form-check-input' id="remember" name="remember" />
                        <label htmlFor="remember" className='form-check-label'>Ghi nhớ đăng nhập</label>
                    </div>
                    <div>
                        <a href="/forgot-password" className="text-link">Quên mật khẩu?</a>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary w-100">Đăng nhập</button>
            </form>

            <div className="divider">
                <span>Hoặc</span>
            </div>

            <div className="social-container">
                <button
                    className="social-btn"
                    onClick={() => onSocialLogin("facebook")}
                >
                    <FaFacebookF />
                </button>
                <button
                    className="social-btn"
                    onClick={() => onSocialLogin("google")}
                >
                    <FaGoogle />
                </button>
                <button
                    className="social-btn"
                    onClick={() => onSocialLogin("github")}
                >
                    <FaGithub />
                </button>
            </div>

            <div className="toggle-form">
                Chưa có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchForm(); }}>Đăng ký ngay</a>
            </div>
        </div>
    );
};

export default LoginForm;