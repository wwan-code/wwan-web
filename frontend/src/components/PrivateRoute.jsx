import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  // Lấy trạng thái đăng nhập từ userSlice (giả sử bạn có isSuccess hoặc user token)
  const { isSuccess, user } = useSelector((state) => state.user);
  const location = useLocation();

  // Kiểm tra xem người dùng đã đăng nhập thành công và có thông tin user chưa
  if (!isSuccess && !user) {
    // Nếu chưa đăng nhập, chuyển hướng họ đến trang đăng nhập.
    // Chúng ta lưu lại vị trí hiện tại (location) để có thể quay lại sau khi đăng nhập thành công.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Nếu đã đăng nhập, hiển thị component con (children)
  return children;
};

export default PrivateRoute;