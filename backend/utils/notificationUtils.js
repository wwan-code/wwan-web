// backend/utils/notificationUtils.js
import { getIo } from '../config/socket.js';
import db from '../models/index.js';

const Notification = db.Notification;
const User = db.User; // Nếu cần lấy thông tin sender

export const createAndEmitNotification = async ({
    recipientId, // ID người nhận
    senderId = null, // ID người gửi (có thể là null nếu là hệ thống)
    type, // Loại thông báo (ví dụ: REPLY_TO_COMMENT, NEW_EPISODE, etc.)
    message, // Nội dung thông báo (có thể chứa HTML)
    link = '#', // Link đến nội dung liên quan
    iconUrl = null, // URL icon (ví dụ: avatar người gửi, poster phim)
    transaction = null, // Sequelize transaction nếu có
}) => {
    if (!recipientId || !type || !message) {
        console.warn('[NotificationUtils] Thiếu thông tin bắt buộc để tạo thông báo:', { recipientId, type, message });
        return null;
    }

    try {
        const notificationData = {
            recipientId,
            senderId,
            type,
            message,
            link,
            iconUrl,
            isRead: false,
        };

        const newNotification = await Notification.create(notificationData, { transaction });

        const io = getIo();
        if (io && newNotification) {
            const recipientRoom = `user_${recipientId}`;
            const unreadCount = await Notification.count({
                where: { recipientId, isRead: false },
                transaction
            });

            io.to(recipientRoom).emit('newNotification', {
                notification: newNotification.toJSON(),
                unreadCount
            });
            console.log(`[NotificationUtils] Emitted '${type}' notification to room: ${recipientRoom}, unread: ${unreadCount}`);
        }
        return newNotification;
    } catch (error) {
        console.error(`[NotificationUtils] Lỗi khi tạo và gửi thông báo (type: ${type}, recipient: ${recipientId}):`, error);
        // Không throw lỗi ở đây để không làm gián đoạn luồng chính, chỉ log lỗi
        return null;
    }
};