// Ví dụ trong một component
import classNames from '@utils/classNames';
import { getAvatarUrl } from '@utils/getAvatarUrl';

const UserAvatarDisplay = ({ userToDisplay, size = "80", className }) => {
    let activeFrameUrl = null;
    if (userToDisplay && userToDisplay.activeAvatarFrame) {
        activeFrameUrl = userToDisplay.activeAvatarFrame;
    }
  
    // Kích thước của khung có thể lớn hơn avatar một chút để tạo hiệu ứng đẹp
    const framePadding = Math.max(2, Math.round(parseInt(size) * 0.25)); // Ví dụ: 5% padding, tối thiểu 2px
    const frameSizeStyle = {
        width: `${parseInt(size) + framePadding * 2}px`,
        height: `${parseInt(size) + framePadding * 2}px`,
    };

    return (
        <div
            className={classNames("user-avatar-container", className)}
            style={frameSizeStyle}
        >
            <img
                src={getAvatarUrl(userToDisplay)}
                alt={userToDisplay?.name || 'Avatar'}
                className="user-avatar-image"
                style={{ width: `${size}px`, height: `${size}px`, objectFit: 'cover', display: 'block', borderRadius: '50%', zIndex: 0 }}
            />
            {activeFrameUrl && (
                <img
                    src={`${process.env.REACT_APP_API_URL}/${activeFrameUrl}`}
                    alt="Avatar Frame"
                    className="user-avatar-frame"
                />
            )}
        </div>
    );
};

export default UserAvatarDisplay;