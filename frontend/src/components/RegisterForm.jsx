import { useState } from 'react';
import { useDispatch } from 'react-redux';
import api from "@services/api";
import { registerUser } from '@features/userSlice';
import { Bounce, toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaShieldAlt, FaFacebookF, FaGoogle, FaGithub } from 'react-icons/fa';
import { GiStarsStack } from 'react-icons/gi';

const RegisterForm = ({
    onSocialLogin, onSwitchForm
}) => {
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const dispatch = useDispatch();
    const [formValue, setFormValue] = useState({
        name: "",
        email: "",
        password: "",
        confPassword: "",
        verificationCode: ""
    });

    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        password: '',
        confPassword: '',
        verificationCode: ''
    });

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        // 8-24 ký tự, ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*])[A-Za-z\d!@#\$%\^&\*]{8,24}$/;
        return passwordRegex.test(password);
    };

    const handleChangeValue = (event) => {
        const { name: field, value } = event.target;
        setFormValue(prev => ({ ...prev, [field]: value }));

        let error = '';
        if (field === 'name') {
            if (!value.trim()) error = 'Tên không được để trống';
        } else if (field === 'email') {
            if (!value.trim()) error = 'Email không được để trống';
            else if (!validateEmail(value)) error = 'Email không hợp lệ';
        } else if (field === 'password') {
            if (!value.trim()) error = 'Mật khẩu không được để trống';
            else if (!validatePassword(value)) error = 'Mật khẩu phải dài 8-24 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt';
        } else if (field === 'verificationCode') {
            if (!value.trim()) error = 'Mã xác minh không được để trống';
            else if (!/^\d{6}$/.test(value)) error = 'Mã xác minh gồm 6 chữ số';
        }

        setErrors(prev => ({ ...prev, [field]: error }));

        // Kiểm tra khớp mật khẩu khi liên quan
        if (field === 'password' || field === 'confPassword') {
            const pw = field === 'password' ? value : formValue.password;
            const cf = field === 'confPassword' ? value : formValue.confPassword;
            if (pw && cf && pw !== cf) {
                setPasswordsMatch(false);
                setErrors(prev => ({ ...prev, confPassword: 'Mật khẩu không khớp' }));
            } else if (pw && cf && pw === cf) {
                setPasswordsMatch(true);
                setErrors(prev => ({ ...prev, confPassword: '' }));
            }
        }
    };

    const handleCheckPassword = (e) => {
        const confPassword = e.target.value;
        setFormValue(prev => ({ ...prev, confPassword }));
        if (!confPassword) {
            setPasswordsMatch(false);
            setErrors(prev => ({ ...prev, confPassword: 'Vui lòng xác nhận mật khẩu' }));
            return;
        }
        if (confPassword !== formValue.password) {
            setPasswordsMatch(false);
            setErrors(prev => ({ ...prev, confPassword: 'Mật khẩu không khớp' }));
        } else {
            setPasswordsMatch(true);
            setErrors(prev => ({ ...prev, confPassword: '' }));
        }
    };

    const handleRegister = (e) => {
        e.preventDefault();
        if (formValue.password !== formValue.confPassword) {
            toast.warn("Mật khẩu chưa khớp", {
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
            return;
        }

        if (formValue.email === "" || formValue.password === "" || formValue.confPassword === "" || formValue.verificationCode === "") {
            toast.error("Vui lòng nhập đầy đủ thông tin", {
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
            return;
        }
        const { name, email, password, confPassword, verificationCode } = formValue;
        setLoading(true);

        dispatch(registerUser({ name, email, password, confPassword, verificationCode }))
            .unwrap()
            .then(() => {
                window.location.href = "/"
            })
            .catch(() => {
                setLoading(false);
            });
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (formValue.email === "") {
            toast.error("Vui lòng nhập địa chỉ email", {
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
            return;
        }
        try {
            await api.post('/auth/send-otp', { email: formValue.email });
        } catch (error) {
            console.log(error)
        } finally {
            toast.success("Mã xác minh đã được gửi đến email của bạn", {
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
        }
    };

    return (
        <div className="form-container">
            <div className="text-center mb-4">
                <GiStarsStack className="icon-xl" style={{ fontSize: '3rem', color: 'var(--w-space-tertiary)' }} />
            </div>

            <h1>Đăng ký</h1>

            <form onSubmit={handleRegister}>
                <div className='form-group'>
                    <label htmlFor="name" className='form-label'>
                        <FaUser className="me-2" /> Tên
                    </label>
                    <input
                        type="text"
                        placeholder="Nhập tên của bạn"
                        className='form-control'
                        value={formValue.name}
                        onChange={handleChangeValue}
                        name="name"
                    />
                    {errors.name && <div className="error-text">{errors.name}</div>}
                </div>

                <div className='form-group'>
                    <label htmlFor="email" className='form-label'>
                        <FaEnvelope className="me-2" /> Email
                    </label>
                    <input
                        type="email"
                        placeholder="Nhập địa chỉ email"
                        className='form-control'
                        value={formValue.email}
                        onChange={handleChangeValue}
                        name="email"
                    />
                    {errors.email && <div className="error-text">{errors.email}</div>}
                </div>

                <div className='form-group'>
                    <label htmlFor="password" className='form-label'>
                        <FaLock className="me-2" /> Mật khẩu
                    </label>
                    <div className="input-with-icon">
                        <input
                            name="password"
                            placeholder="********"
                            type={showPw ? "text" : "password"}
                            className="form-control"
                            value={formValue.password}
                            onChange={handleChangeValue}
                        />
                        <span
                            className="password-toggle"
                            onClick={() => setShowPw(!showPw)}
                        >
                            {showPw ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>
                    {errors.password && <div className="error-text">{errors.password}</div>}
                </div>

                <div className='form-group'>
                    <label htmlFor="confPassword" className='form-label'>
                        <FaLock className="me-2" /> Xác nhận mật khẩu
                    </label>
                    <input
                        type={showPw ? "text" : "password"}
                        placeholder="********"
                        className='form-control'
                        value={formValue.confPassword}
                        onChange={handleCheckPassword}
                        name="confPassword"
                    />
                    {errors.confPassword && <div className="error-text">{errors.confPassword}</div>}
                </div>

                <div className='form-group'>
                    <label htmlFor="verificationCode" className='form-label'>
                        <FaShieldAlt className="me-2" /> Mã xác minh email
                    </label>
                    <div className="d-flex gap-2">
                        <input
                            type="text"
                            placeholder="Nhập mã xác minh"
                            className='form-control'
                            value={formValue.verificationCode}
                            onChange={handleChangeValue}
                            name="verificationCode"
                        />
                        <button
                            type="button"
                            className='btn btn-secondary'
                            onClick={handleSendOTP}
                            disabled={!formValue.email || errors.email}
                        >
                            Gửi mã
                        </button>
                    </div>
                    {errors.verificationCode && <div className="error-text">{errors.verificationCode}</div>}
                </div>

                <div className="btn-group">
                    <button
                        type="submit"
                        className='btn btn-primary'
                        disabled={loading || !passwordsMatch || Object.values(errors).some(Boolean)}
                    >
                        {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                    </button>
                </div>
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
                Đã có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); onSwitchForm(); }}>Đăng nhập ngay</a>
            </div>
        </div>
    );
};

export default RegisterForm;