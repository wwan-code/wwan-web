import bcrypt from "bcrypt";
import multer from "multer";
import { Op } from "sequelize";
import crypto from 'crypto';
import DeviceDetector from 'node-device-detector';
import { createToken } from "../utils/jwtHelpers.js";
import imageKit from "../middlewares/imagekit.js";
import sendEmail from '../utils/emailHelper.js';
import sequelize from "../config/database.js";
import db from "../models/index.js";

const User = db.User;
const Verification = db.Verification;
const Comment = db.Comment;
const WatchHistory = db.WatchHistory;
const FollowMovie = db.FollowMovie;
const Rating = db.Rating;
const Favorite = db.Favorite;
const Episode = db.Episode;
const Movie = db.Movie;
const UserInventory = db.UserInventory;
const ShopItem = db.ShopItem;

const deviceDetector = new DeviceDetector;

export const upload = multer({ storage: multer.memoryStorage() }).single("avatar");

const getUserResponse = async (user) => {
    const userRoles = await user.getRoles();
    const authorities = userRoles.map(role => `ROLE_${role.name.toUpperCase()}`);
    let activeAvatarFrame = null;
    let activeChatColor = null;
    let activeTheme = null;
    let activeProfileBackground = null;

    if (user && user.id) {
        const activeItems = await UserInventory.findAll({
            where: { userId: user.id, isActive: true },
            include: [{ model: ShopItem, as: 'itemDetails', attributes: ['type', 'value'] }]
        });

        activeItems.forEach(invItem => {
            if (invItem.itemDetails) {
                switch (invItem.itemDetails.type) {
                    case 'AVATAR_FRAME':
                        activeAvatarFrame = invItem.itemDetails.value;
                        break;
                    case 'CHAT_COLOR':
                        activeChatColor = invItem.itemDetails.value;
                        break;
                    case 'THEME_UNLOCK':
                        activeTheme = invItem.itemDetails.value;
                        break;
                    case 'PROFILE_BACKGROUND':
                        activeProfileBackground = invItem.itemDetails.value;
                        break;
                }
            }
        });
    }
    return {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        roles: authorities,
        accessToken: createToken(user.id),
        createdAt: user.createdAt,
        status: user.status,
        socialLinks: user.socialLinks || { github: '', twitter: '', instagram: '', facebook: '' },
        activeAvatarFrame,
        activeChatColor,
        activeTheme,
        activeProfileBackground,
        points: user.points || 0,
        level: user.level || 1,
        lastLoginStreakAt: user.lastLoginStreakAt || null,
        privacySettings: user.privacySettings || { showFriendsList: 'public', showTimeline: 'public' }
    };
};

export const register = async (req, res) => {
    const { name, email, password, confPassword, verificationCode } = req.body;
    if (!name || !email || !password || !confPassword) {
        return res.status(400).json({ message: 'Dữ liệu nhập vào không đầy đủ' });
    }
    if (password !== confPassword) {
        return res.status(401).json({ message: 'Passwords do not match' });
    }

    try {
        const result = await sequelize.transaction(async (t) => {
            const verification = await Verification.findOne({
                where: { email, verificationCode },
                transaction: t // Thêm transaction vào query
            });

            if (!verification) {
                // Ném lỗi bên trong transaction sẽ tự động rollback
                throw new Error('Mã xác nhận email không đúng');
            }

            await Verification.destroy({ where: { email }, transaction: t });

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await User.create({
                name,
                email,
                password: hashedPassword
            }, { transaction: t }); // Thêm transaction vào query

            await user.setRoles([3], { transaction: t }); // Thêm transaction vào query

            return user; // Trả về user nếu thành công
        });

        const response = await getUserResponse(result);

        res.status(201).json({ ...response, message: `Đăng ký thành công ID: ${result.id}` });
    } catch (err) {
        console.error("Registration Error:", err); // Log lỗi đầy đủ ở server
        // Kiểm tra lỗi cụ thể từ Sequelize (ví dụ: UniqueConstraintError)
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Email đã tồn tại.' });
        }
        res.status(500).json({ message: "Đã xảy ra lỗi trong quá trình đăng ký." }); // Thông báo chung
    }
};

export const sendVerificationCode = async (req, res) => {
    const { email } = req.body;
    try {
        const verification = await Verification.findOne({ where: { email } });

        if (verification) {
            return res.status(400).json({ message: 'Email đã được xác nhận' });
        }

        // Tạo mã xác nhận email ngẫu nhiên
        const verificationCode = Math.floor(100000 + Math.random() * 900000);

        // Lưu trữ mã xác nhận email trong database
        await Verification.create({
            email,
            verificationCode,
            expires: Date.now() + 300000 // Mã xác nhận email hết hạn sau 5 phút
        });

        const mailOptions = {
            to: email,
            from: 'contact.wwan@gmail.com',
            subject: 'Xác nhận email',
            html: `
            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333; font-weight: bold;">Xác nhận email</h2>
                <p style="color: #666; font-size: 16px;">Mã xác nhận email của bạn là: ${verificationCode}</p>
                <p style="color: #666; font-size: 16px;">Vui lòng nhập mã xác nhận email này vào trang đăng ký để hoàn tất quá trình đăng ký.</p>
                <button style="background-color: #4CAF50; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Đăng ký ngay</button>
            </div>
            `,
        };

        await sendEmail(mailOptions);

        res.status(200).json({ message: 'Mã xác nhận email đã được gửi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// cron.schedule('*/1 * * * *', async () => {
//     try {
//         const currentTime = Date.now();

//         const expiredVerifications = await Verification.findAll({
//             where: {
//                 expires: { [Op.lt]: currentTime }
//             }
//         });

//         if (expiredVerifications.length > 0) {
//             await Verification.destroy({
//                 where: {
//                     expires: { [Op.lt]: currentTime }
//                 }
//             });
//         }
//     } catch (error) {
//         console.error('Lỗi khi xóa mã xác nhận email hết hạn:', error);
//     }
// });

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({
            where: { email, deletedAt: null }
        });
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({
                accessToken: null,
                message: "Mật khẩu không hợp lệ!",
            });
        }
        const userAgent = req.headers['user-agent'];
        const deviceInfo = deviceDetector.detect(userAgent);

        req.session.deviceInfo = { // Lưu vào session của người dùng hiện tại
            os: `${deviceInfo.os.name} ${deviceInfo.os.version || ''}`.trim(),
            client: `${deviceInfo.client.name} ${deviceInfo.client.version || ''}`.trim(),
            device: `${deviceInfo.device.type || 'Unknown'} ${deviceInfo.device.brand || 'N/A'})`.trim(),
            ip: req.ip // Lấy IP của request
        };
        // Cập nhật lastActiveAt cho user
        user.lastActiveAt = new Date();
        await user.save()
        const response = await getUserResponse(user);
        res.status(200).json({ ...response, message: `Đăng nhập thành công ID: ${user.id}` });
    } catch (err) {
        console.error("Login Error:", err); // Log lỗi đầy đủ ở server
        res.status(500).json({ message: "Đã xảy ra lỗi trong quá trình đăng nhập." }); // Thông báo chung
    }
};

export const logout = (req, res) => {
    res.clearCookie("accessToken", {
        secure: true,
        sameSite: "none",
    }).status(200).json("Đăng xuất thành công!");
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        // Tạo token đặt lại mật khẩu
        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // Token hết hạn sau 1 giờ

        // Lưu token vào database
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        const mailOptions = {
            to: user.email,
            from: 'contact.wwan@gmail.com',
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process:\n\n
            http://localhost:3000/reset-password/${resetToken}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`,
        };

        await sendEmail(mailOptions);
        res.status(200).json({ message: 'Email đặt lại mật khẩu đã được gửi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });
        if (!user) {
            return res.status(400).json({ message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });
        }

        // Đặt lại mật khẩu
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({ message: 'Mật khẩu đã được đặt lại' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const uploadAvatar = async (req, res) => {
    try {
        const uuid = req.params.uuid;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "File không được truyền vào" });
        }

        const user = await User.findOne({ where: { uuid } });
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        if (user.avatarFileId) {
            try {
                console.log("Deleting file with ID:", user.avatarFileId);
                await imageKit.deleteFile(user.avatarFileId);
            } catch (error) {
                console.error("Lỗi khi xóa ảnh cũ:", error.message);
            }
        }

        const uploadedFile = await imageKit.upload({
            file: file.buffer.toString("base64"),
            fileName: file.originalname,
            folder: "/avatars",
        });

        user.avatar = uploadedFile.url;
        user.avatarFileId = uploadedFile.fileId;
        await user.save();

        const response = await getUserResponse(user);
        res.status(200).json({ ...response, message: "Cập nhật avatar thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi cập nhật avatar: " + error.message });
    }
};

export const updateProfile = async (req, res) => {
    const { name, email, phoneNumber, socialLinks, removeAvatar } = req.body;
    const uuid = req.params.uuid;
    const file = req.file;
    try {
        const user = await User.findOne({
            where: { uuid, deletedAt: null }
        });
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        // Cập nhật thông tin cơ bản
        await user.update({
            name: name || user.name,
            email: email || user.email,
            phoneNumber: phoneNumber || user.phoneNumber,
            socialLinks: typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks || user.socialLinks
        });

        // Xử lý xóa avatar nếu được yêu cầu
        if (removeAvatar === 'true' || removeAvatar === true) {
            if (user.avatarFileId) {
                try {
                    await imageKit.deleteFile(user.avatarFileId);
                } catch (error) {
                    console.error("Lỗi khi xóa ảnh cũ:", error.message);
                }
            }
            user.avatar = null;
            user.avatarFileId = null;
            await user.save();
        }

        // Xử lý upload avatar mới nếu có file
        if (file) {
            // Xóa avatar cũ nếu có
            if (user.avatarFileId) {
                try {
                    await imageKit.deleteFile(user.avatarFileId);
                } catch (error) {
                    console.error("Lỗi khi xóa ảnh cũ:", error.message);
                }
            }
            // Upload file mới
            const uploadedFile = await imageKit.upload({
                file: file.buffer.toString("base64"),
                fileName: file.originalname,
                folder: "/avatars",
            });
            user.avatar = uploadedFile.url;
            user.avatarFileId = uploadedFile.fileId;
            await user.save();
        }

        const response = await getUserResponse(user);

        res.status(200).json({ ...response, message: `Cập nhật thành công ID: ${user.id}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const socialLogin = async (req, res) => {
    const { uuid, name, email, phoneNumber, provider, avatar } = req.body;

    try {
        let user = await User.findOne({ where: { uuid: uuid } });

        if (!user) {
            user = await User.create({
                uuid: uuid,
                name,
                email,
                phoneNumber,
                provider,
                avatar
            });
            await user.setRoles([3]);
        }
        const response = await getUserResponse(user);
        res.status(200).json({ ...response, message: `Đăng nhập thành công ID: ${user.id}` });
    } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getUserTimeline = async (req, res) => {
    const { uuid } = req.params;

    try {
        const user = await User.findOne({ where: { uuid } });
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        const [comments, watchHistories, followMovies, ratings, favorites] = await Promise.all([
            Comment.findAll({ where: { userId: user.id } }),
            WatchHistory.findAll({ where: { userId: user.id }, include: [{ model: Episode, include: [Movie] }] }),
            FollowMovie.findAll({
                where: { userId: user.id }, include: [{
                    model: Movie,
                    as: 'movie',
                }]
            }),
            Rating.findAll({
                where: { userId: user.id }, include: [{
                    model: Movie,
                    as: 'movie',
                }]
            }),
            Favorite.findAll({
                where: { userId: user.id }, include: [Episode, {
                    model: Movie,
                    as: 'movie',
                }]
            })
        ]);

        const timeline = [
            ...comments.map(comment => ({ type: 'comment', content: comment.content, createdAt: comment.createdAt })),
            ...watchHistories.map(history => ({ type: 'watchHistory', movieTitle: history.Episode.movie.title, episodeNumber: history.Episode.episodeNumber, createdAt: history.watchedAt })),
            ...followMovies.map(follow => ({ type: 'followMovie', movieTitle: follow.movie.title, createdAt: follow.createdAt })),
            ...ratings.map(rating => ({ type: 'rating', movieTitle: rating.movie.title, rating: rating.rating, createdAt: rating.createdAt })),
            ...favorites.map(favorite => ({ type: 'favorite', movieTitle: favorite.movie.title, episodeNumber: favorite.Episode.episodeNumber, createdAt: favorite.createdAt }))
        ];

        timeline.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(timeline);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAccount = async (req, res) => {
    const userId = req.userId; // Lấy từ middleware authJwt
    const { password } = req.body; // Lấy mật khẩu xác nhận từ body

    if (!password) {
        return res.status(400).json({ message: "Cần xác nhận mật khẩu." });
    }

    try {
        const user = await User.findOne({
            where: {
                id: userId,
                deletedAt: null
            }
        });

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng hoặc đã bị xóa." });
        }

        if (!user.password) {
            return res.status(400).json({ message: "Không thể xóa tài khoản được tạo thông qua đăng nhập bằng mạng xã hội bằng phương pháp này." });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ message: "Mật khẩu không hợp lệ!" });
        }

        // 1. Xóa avatar trên ImageKit (nếu có)
        if (user.avatarFileId) {
            try {
                console.log("Attempting to delete avatar:", user.avatarFileId);
                await imageKit.deleteFile(user.avatarFileId);
                console.log("Avatar deleted successfully from ImageKit.");
            } catch (error) {
                console.error("Error deleting avatar from ImageKit:", error.message);
            }
        }

        // 2. Đánh dấu xóa (Soft Delete)
        user.deletedAt = new Date();
        user.status = 'deleted'; // Cập nhật status (nếu có)
        // Tùy chọn: Vô hiệu hóa email để có thể đăng ký lại sau này
        user.email = `${user.email}_deleted_${Date.now()}`;
        // Tùy chọn: Xóa các thông tin nhạy cảm khác nếu cần
        user.avatar = null;
        user.avatarFileId = null;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.socialLinks = null; // Hoặc để lại tùy yêu cầu

        await user.save(); // Lưu thay đổi

        // 3. (TODO - Nâng cao) Xử lý dữ liệu liên quan:
        // Bạn có thể muốn ẩn danh/xóa các bình luận, đánh giá, lịch sử xem... của người dùng này.
        // Ví dụ: Comment.update({ userId: null }, { where: { userId: user.id } });
        // Việc này cần xem xét cẩn thận tùy theo logic nghiệp vụ của bạn.

        // 4. Đăng xuất người dùng (xóa cookie)
        res.clearCookie("accessToken", {
            secure: true, // Nhớ đặt true nếu dùng HTTPS
            sameSite: "none", // Cần thiết cho cross-site cookies
        });

        // 5. Trả về thông báo thành công
        // Sử dụng 204 No Content thường phù hợp cho DELETE thành công không cần trả về body
        res.status(204).send();

    } catch (error) {
        console.error("Delete Account Error:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi xóa tài khoản." });
    }
};