import { useEffect, useState } from 'react';
import LoginForm from '@components/LoginForm';
import RegisterForm from '@components/RegisterForm';
import { ToastContainer } from 'react-toastify';
import { GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider, signInWithPopup, getAuth, fetchSignInMethodsForEmail, linkWithCredential } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { useDispatch } from 'react-redux';
import { loginWithThirdParty } from '@features/userSlice';
import { useNavigate } from 'react-router-dom';
import { FaRocket } from 'react-icons/fa';
import { GiGalaxy } from 'react-icons/gi';
import '@assets/scss/pages/_auth-page.scss';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const AuthPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeForm, setActiveForm] = useState('login');
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // useEffect(() => {
    //     const signUpButton = document.getElementById('signUp');
    //     const signInButton = document.getElementById('signIn');
    //     const container = document.getElementById('container');

    //     signUpButton.addEventListener('click', () => {
    //         container.classList.add("right-panel-active");
    //     });

    //     signInButton.addEventListener('click', () => {
    //         container.classList.remove("right-panel-active");
    //     });
    // }, []);

    const handleSocialLogin = async (provider) => {
        if (!auth) {
            console.error("Lỗi: Firebase chưa được khởi tạo.");
            return;
        }

        let authProvider;
        switch (provider) {
            case "google":
                authProvider = new GoogleAuthProvider();
                break;
            case "facebook":
                authProvider = new FacebookAuthProvider();
                break;
            case "github":
                authProvider = new GithubAuthProvider();
                break;
            default:
                console.error(`Lỗi: Nhà cung cấp "${provider}" không được hỗ trợ.`);
                return;
        }

        try {
            setIsLoading(true);

            const result = await signInWithPopup(auth, authProvider);
            const user = result.user;

            dispatch(loginWithThirdParty({
                uuid: user.uid,
                email: user.email,
                name: user.displayName || user.email,
                avatar: user.photoURL,
                phoneNumber: user.phoneNumber,
                provider
            }));

            navigate('/');

        } catch (error) {
            console.error("Lỗi đăng nhập bằng tài khoản mạng xã hội:", error);

            if (error.code === "auth/account-exists-with-different-credential") {
                const existingEmail = error.customData?.email;
                const pendingCredential = error.credential;

                if (!existingEmail || !pendingCredential) {
                    console.error("Lỗi: Không tìm thấy email hoặc thông tin xác thực.");
                    return;
                }

                try {
                    const providers = await fetchSignInMethodsForEmail(auth, existingEmail);
                    console.log("Nhà cung cấp đã liên kết với email này:", providers);

                    if (providers.length > 0) {
                        const primaryProvider = getAuthProvider(providers[0]);
                        const primaryResult = await signInWithPopup(auth, primaryProvider);

                        await linkWithCredential(primaryResult.user, pendingCredential);
                        console.log("Tài khoản đã được liên kết thành công!");
                    } else {
                        console.error("Lỗi: Không có phương thức đăng nhập nào phù hợp với email này.");
                    }
                } catch (linkError) {
                    console.error("Lỗi khi liên kết tài khoản:", linkError);
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm helper để lấy provider phù hợp
    const getAuthProvider = (providerId) => {
        switch (providerId) {
            case "google.com": return new GoogleAuthProvider();
            case "facebook.com": return new FacebookAuthProvider();
            case "github.com": return new GithubAuthProvider();
            default: throw new Error(`Lỗi: Không xác định được nhà cung cấp "${providerId}".`);
        }
    };

    const renderStars = () => {
        const stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push(<div key={i} className="star"></div>);
        }
        return <div className="stars">{stars}</div>;
    };

    return (
        <>
            <div className="auth-container">
                {renderStars()}

                <div className="planet planet-1"></div>
                <div className="planet planet-2"></div>

                <div className="auth-card">
                    <div className="auth-form-section">
                        {activeForm === 'login' ? (
                            <LoginForm
                                onSocialLogin={handleSocialLogin}
                                onSwitchForm={() => setActiveForm('register')}
                            />
                        ) : (
                            <RegisterForm
                                onSocialLogin={handleSocialLogin}
                                onSwitchForm={() => setActiveForm('login')}
                            />
                        )}
                    </div>

                    <div className="auth-banner">
                        <div className="banner-content">
                            <GiGalaxy className="icon-xl mb-3" style={{ fontSize: '3rem', color: 'var(--w-white)' }} />
                            <h2>Khám phá vũ trụ truyện tranh</h2>
                            <p>
                                {activeForm === 'login'
                                    ? "Đăng nhập để tiếp tục hành trình khám phá vũ trụ truyện tranh vô tận của chúng tôi"
                                    : "Tham gia cộng đồng người yêu truyện tranh và khám phá hàng ngàn tác phẩm đặc sắc"}
                            </p>
                            <FaRocket className="mt-3" style={{ fontSize: '2rem', opacity: 0.7 }} />
                        </div>
                    </div>
                </div>

                <ToastContainer />
            </div>
        </>
    );
};

export default AuthPage;