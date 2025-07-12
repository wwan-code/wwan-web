// src/services/api.jsx
import axios from 'axios';
import authHeader from '@services/auth-header';
import eventBus from '@utils/eventBus';
import NProgress from 'nprogress';

// Lấy baseURL từ biến môi trường, fallback về URL mặc định nếu không có
// Trong Vite, bạn sẽ dùng import.meta.env.VITE_API_URL
// Trong Create React App, bạn sẽ dùng process.env.REACT_APP_API_URL
const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
});

// --- Axios Interceptors ---

// Request Interceptor: Thêm Authorization header và NProgress
api.interceptors.request.use(
  (config) => {
    NProgress.start();
    const userAuthHeader = authHeader();
    if (userAuthHeader && userAuthHeader.Authorization) {
      config.headers['Authorization'] = userAuthHeader.Authorization;
    }
    // Thêm các headers khác nếu cần cho từng request
    // Ví dụ, nếu là FormData, header Content-Type sẽ được tự động set bởi Axios khi có FormData
    if (config.data instanceof FormData) {
      // Để Axios tự đặt Content-Type cho FormData
      // delete config.headers['Content-Type']; // Hoặc config.headers['Content-Type'] = 'multipart/form-data'; (nhưng thường Axios tự xử lý tốt hơn)
    }
    return config;
  },
  (error) => {
    NProgress.done(); // Kết thúc NProgress nếu có lỗi trong request interceptor
    return Promise.reject(error);
  }
);

// Response Interceptor: Xử lý lỗi chung và NProgress
api.interceptors.response.use(
  (response) => {
    NProgress.done();
    return response;
  },
  (error) => {
    NProgress.done();
    if (error.response) {
      console.error("API Error Response:", error.response.data);
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);

      if (error.response.status === 401) {
        // Lỗi Unauthenticated (ví dụ: token hết hạn hoặc không hợp lệ)
        // Phát sự kiện 'logout' để AppContext hoặc các component khác xử lý
        // (ví dụ: xóa user khỏi localStorage, chuyển hướng về trang login)
        eventBus.dispatch("logout", { message: "Phiên đăng nhập hết hạn hoặc không hợp lệ." });
        // Bạn có thể không muốn toast ở đây vì eventBus đã xử lý
        // toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else if (error.response.status === 403) {
        // Lỗi Forbidden (không có quyền truy cập)
        // toast.error("Bạn không có quyền thực hiện hành động này.");
      } else if (error.response.status >= 500) {
        // Lỗi server
        // toast.error("Lỗi máy chủ. Vui lòng thử lại sau.");
      }
    } else if (error.request) {
      console.error("API No Response:", error.request);
    } else {
      if (error.code === 'ERR_CANCELED') {
        // Request was canceled, do not treat as error
        // Optionally: console.info("Request canceled:", error.message);
      } else {
        console.error("API Error:", error.message);
        // toast.error("Đã có lỗi xảy ra khi gửi yêu cầu.");
      }
    }
    return Promise.reject(error); // Quan trọng: reject error để .catch() ở nơi gọi API có thể bắt được
  }
);

export default api;