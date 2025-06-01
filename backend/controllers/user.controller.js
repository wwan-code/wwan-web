import bcrypt from 'bcrypt';
import { getIo } from '../config/socket.js';
import DeviceDetector from 'node-device-detector';
import db from "../models/index.js";
import { Op, fn, col, literal, Sequelize } from 'sequelize'; // Import Sequelize
import { handleServerError } from "../utils/errorUtils.js";
import { createAndEmitNotification } from '../utils/notificationUtils.js';
const Session = db.Session;
const User = db.User;
const Role = db.Role;
const Friend = db.Friend;
const Notification = db.Notification;
const WatchHistory = db.WatchHistory;
const Comment = db.Comment;
const Rating = db.Rating;
const Episode = db.Episode;
const Movie = db.Movie;
const Genre = db.Genre;
const Category = db.Category;
const Country = db.Country;
const UserInventory = db.UserInventory;
const ShopItem = db.ShopItem;

const deviceDetectorInstance = new DeviceDetector();

// Helper để parse data session
const parseSessionData = (sessionDataString) => {
    try {
        // connect-session-sequelize lưu session data dưới dạng JSON string
        return JSON.parse(sessionDataString);
    } catch (e) {
        console.error("Error parsing session data:", e);
        return null;
    }
};

// --- Hàm Helper Định dạng User Response ---
const formatUserResponse = (user, roles) => ({
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    avatar: user.avatar,
    googleId: user.googleId,
    roles: roles.map(r => r.name),
    createdAt: user.createdAt,
    status: user.status,
    socialLinks: user.socialLinks
});

const getGenrePreferences = async (userId) => {
    const watchHistory = await WatchHistory.findAll({
        where: { userId },
        include: [{
            model: Episode,
            attributes: ['movieId'],
            include: [{
                model: Movie,
                as: 'movie', // Đảm bảo alias này đúng với model Episode
                attributes: ['id'],
                include: [{
                    model: Genre,
                    as: 'genres', // Đảm bảo alias này đúng với model Movie
                    attributes: ['id', 'title'],
                    through: { attributes: [] } // Bỏ qua bảng trung gian nếu là N-M
                }]
            }]
        }]
    });

    const genreCounts = {};
    watchHistory.forEach(historyItem => {
        historyItem.episode?.movie?.genres?.forEach(genre => {
            genreCounts[genre.id] = (genreCounts[genre.id] || 0) + 1;
        });
    });

    // Sắp xếp thể loại theo số lần xem giảm dần
    const sortedGenres = Object.entries(genreCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([id, count]) => ({ id: parseInt(id), count }));

    return sortedGenres; // Trả về mảng [{ id: genreId1, count: X }, { id: genreId2, count: Y }, ...]
};

// Helper để lấy thông tin public của một user, bao gồm active items
const getPublicUserInfoWithActiveItems = async (userInstance) => {
    if (!userInstance) return null;

    const userData = {
        id: userInstance.id,
        uuid: userInstance.uuid,
        name: userInstance.name,
        avatar: userInstance.avatar,
        // Thêm các trường công khai khác nếu cần
        activeAvatarFrame: null,
        activeChatColor: null, // Nếu muốn hiển thị màu chat của bạn bè
        activeTheme: null,
        activeProfileBackground: null
    };

    const activeItems = await UserInventory.findAll({
        where: { userId: userInstance.id, isActive: true },
        include: [{
            model: ShopItem,
            as: 'itemDetails',
            attributes: ['type', 'value'],
            required: true
        }]
    });
    activeItems.forEach(invItem => {
        if (invItem.itemDetails) {
            switch (invItem.itemDetails.type) {
                case 'AVATAR_FRAME':
                    userData.activeAvatarFrame = invItem.itemDetails.value;
                    break;
                case 'CHAT_COLOR':
                    userData.activeChatColor = invItem.itemDetails.value;
                    break;
                case 'THEME_UNLOCK':
                    userData.activeTheme = invItem.itemDetails.value;
                    break;
                case 'PROFILE_BACKGROUND':
                    userData.activeProfileBackground = invItem.itemDetails.value;
                    break;
            }
        }
    });


    return userData;
};
export default class UserController {
    // Create a new user (Chuẩn hóa lỗi/response)
    async createUser(req, res) {
        try {
            const { name, email, roles: roleNames, phoneNumber, status, password } = req.body; // Đổi tên roles -> roleNames

            // Kiểm tra các trường bắt buộc
            if (!name || !email || !password) {
                return res.status(400).json({ success: false, message: 'Tên, email, và mật khẩu là bắt buộc.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await User.create({
                name, email, phoneNumber, status, password: hashedPassword
            });

            let assignedRoles = [];
            if (roleNames && Array.isArray(roleNames) && roleNames.length > 0) {
                // Tìm các Role objects dựa trên tên
                const foundRoles = await Role.findAll({ where: { name: { [Op.in]: roleNames } } });
                if (foundRoles.length !== roleNames.length) {
                    console.warn("Một số role không tìm thấy:", roleNames);
                    // Có thể throw lỗi hoặc chỉ gán những role tìm thấy
                }
                if (foundRoles.length > 0) {
                    await user.setRoles(foundRoles); // Gán trực tiếp Role objects
                    assignedRoles = foundRoles; // Lưu lại để trả về
                } else {
                    // Nếu không tìm thấy role nào hợp lệ, gán role mặc định
                    const defaultRole = await Role.findByPk(3); // Giả sử ID 3 là role USER
                    if (defaultRole) {
                        await user.setRoles([defaultRole]);
                        assignedRoles = [defaultRole];
                    }
                }
            } else {
                // Gán vai trò mặc định (ví dụ: USER - ID 3)
                const defaultRole = await Role.findByPk(3);
                if (defaultRole) {
                    await user.setRoles([defaultRole]);
                    assignedRoles = [defaultRole];
                }
            }

            res.status(201).json({ // Dùng json
                success: true,
                user: formatUserResponse(user, assignedRoles), // Dùng helper
                message: "User created successfully"
            });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ success: false, message: 'Email đã tồn tại.' });
            }
            handleServerError(res, error, "Tạo người dùng");
        }
    }

    // Get all users (Thêm phân trang, tối ưu response, chuẩn hóa lỗi)
    async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '20', 10);
            const offset = (page - 1) * limit;

            const { count, rows } = await User.findAndCountAll({
                attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }, // Loại bỏ các trường nhạy cảm
                include: [
                    {
                        model: Role,
                        as: 'roles', // Đảm bảo alias đúng
                        attributes: ['name'], // Chỉ lấy tên role
                        through: { attributes: [] } // Bỏ qua bảng trung gian
                    },
                ],
                limit: limit,
                offset: offset,
                order: [['createdAt', 'DESC']], // Sắp xếp mặc định
                distinct: true // Cần thiết khi include N-M và phân trang
            });

            const totalPages = Math.ceil(count / limit);

            // Format response trực tiếp từ kết quả, không cần gọi getRoles() lại
            const formattedUsers = rows.map(user => formatUserResponse(user, user.roles || []));

            res.status(200).json({ // Dùng json
                success: true,
                users: formattedUsers,
                pagination: {
                    totalItems: count,
                    totalPages: totalPages,
                    currentPage: page,
                    itemsPerPage: limit
                }
            });
        } catch (error) {
            handleServerError(res, error, "Lấy danh sách người dùng");
        }
    }

    // Get a user by ID (Chuẩn hóa lỗi/response)
    async getUserById(req, res) {
        try {
            const id = req.params.id;
            const user = await User.findByPk(id, {
                attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
                include: [{ model: Role, as: 'roles', attributes: ['name'], through: { attributes: [] } }]
            });
            if (!user) {
                return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
            } else {
                res.status(200).json({ success: true, user: formatUserResponse(user, user.roles || []) });
            }
        } catch (error) {
            handleServerError(res, error, `Lấy người dùng ID ${req.params.id}`);
        }
    }

    // Update a user (Tối ưu response, chuẩn hóa lỗi)
    async updateUser(req, res) {
        try {
            const id = req.params.id;
            // Chỉ lấy các trường cho phép cập nhật từ body
            const { name, email, roles: roleNames, phoneNumber, status } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
            }

            // Cập nhật các trường nếu chúng được cung cấp trong body
            if (name !== undefined) user.name = name;
            if (email !== undefined) user.email = email;
            if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
            if (status !== undefined) user.status = status;

            let updatedRoles = await user.getRoles(); // Lấy roles hiện tại để trả về nếu không có thay đổi roles
            // Cập nhật roles nếu được cung cấp
            if (roleNames && Array.isArray(roleNames)) {
                const foundRoles = await Role.findAll({ where: { name: { [Op.in]: roleNames } } });
                await user.setRoles(foundRoles); // Gán lại roles
                updatedRoles = foundRoles; // Cập nhật roles để trả về
            }

            await user.save(); // Lưu thay đổi

            res.status(200).json({ // Dùng json
                success: true,
                user: formatUserResponse(user, updatedRoles), // Dùng helper và roles đã cập nhật
                message: "User updated successfully"
            });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ success: false, message: 'Email đã được sử dụng.' });
            }
            handleServerError(res, error, `Cập nhật người dùng ID ${req.params.id}`);
        }
    }

    // Delete a user (Chuẩn hóa lỗi/response)
    async deleteUser(req, res) {
        try {
            const id = req.params.id;
            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
            } else {
                await user.destroy();
                res.status(200).json({ success: true, message: "User deleted successfully" }); // Dùng json
            }
        } catch (error) {
            handleServerError(res, error, `Xóa người dùng ID ${req.params.id}`);
        }
    }

    async getUserBadges(req, res) {
        const { userIdOrUuid } = req.params;
        const currentAuthUserId = req.userId; // User đang đăng nhập

        try {
            const targetUser = await User.findOne({
                where: {
                    [userIdOrUuid.length > 10 ? 'uuid' : 'id']: userIdOrUuid
                }
            });

            if (!targetUser) {
                return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
            }

            const badges = await targetUser.getBadges({ // Sử dụng alias 'badges'
                attributes: ['id', 'name', 'description', 'iconUrl', 'criteriaType', 'criteriaValue'],
                joinTableAttributes: ['earnedAt'] // Lấy cả thời gian nhận huy hiệu
            });

            res.status(200).json({ success: true, badges });
        } catch (error) {
            handleServerError(res, error, `Lấy huy hiệu cho người dùng ${userIdOrUuid}`);
        }
    }

    async getUserStats(req, res) {
        try {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            // Dùng Promise.all để chạy song song
            const [dailyStatsRaw, monthlyStatsRaw, statusStatsRaw] = await Promise.all([
                User.findAll({
                    attributes: [[fn('DATE', col('createdAt')), 'date'], [fn('COUNT', col('id')), 'count']],
                    where: { createdAt: { [Op.gte]: lastMonth } },
                    group: [fn('DATE', col('createdAt'))],
                    order: [[fn('DATE', col('createdAt')), 'ASC']],
                    raw: true // Lấy kết quả dạng plain object
                }),
                User.findAll({
                    attributes: [[fn('MONTH', col('createdAt')), 'month'], [fn('COUNT', col('id')), 'count']],
                    where: { createdAt: { [Op.gte]: new Date(new Date().getFullYear(), 0, 1) } },
                    group: [fn('MONTH', col('createdAt'))],
                    order: [[fn('MONTH', col('createdAt')), 'ASC']],
                    raw: true
                }),
                User.findAll({
                    attributes: ['status', [fn('COUNT', col('id')), 'count']],
                    group: ['status'],
                    raw: true
                })
            ]);

            // Format lại cho dễ dùng ở frontend nếu cần
            const formattedMonthly = monthlyStatsRaw.map(s => ({ month: s.month, count: parseInt(s.count, 10) }));
            const formattedStatus = statusStatsRaw.map(s => ({ status: s.status, count: parseInt(s.count, 10) }));
            const formattedDaily = dailyStatsRaw.map(s => ({ date: s.date, count: parseInt(s.count, 10) }));


            res.status(200).json({
                success: true,
                stats: { // Trả về trong key 'stats'
                    daily: formattedDaily,
                    monthly: formattedMonthly,
                    status: formattedStatus
                }
            });
        } catch (error) {
            handleServerError(res, error, "Lấy thống kê người dùng");
        }
    }

    async sendFriendRequest(req, res) {
        const requesterId = req.userId;
        const { friendId: recipientId } = req.body;
        const t = await db.sequelize.transaction();

        if (!requesterId || !recipientId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin userId hoặc friendId." });
        }
        if (requesterId === recipientId) {
            return res.status(400).json({ success: false, message: "Không thể tự gửi lời mời kết bạn." });
        }

        try {
            const existingFriendship = await Friend.findOne({
                where: {
                    [Op.or]: [
                        { userId: requesterId, friendId: recipientId },
                        { userId: recipientId, friendId: requesterId }
                    ]
                }
            });

            if (existingFriendship) {
                if (existingFriendship.status === 'accepted') {
                    await t.rollback(); return res.status(409).json({ success: false, message: "Đã là bạn bè." });
                } else if (existingFriendship.status === 'pending') {
                    if (existingFriendship.userId === requesterId) {
                       await t.rollback(); return res.status(409).json({ success: false, message: "Đã gửi lời mời trước đó." });
                    } else {
                        await t.rollback(); return res.status(409).json({ success: false, message: "Người này đã gửi lời mời cho bạn." });
                    }
                }
            }

            await Friend.create({ userId: requesterId, friendId: recipientId, status: 'pending' }, { transaction: t });

            const requester = await User.findByPk(requesterId, { attributes: ['id', 'name', 'uuid', 'avatar'] });
            if (requester) {
                await createAndEmitNotification({
                    recipientId: recipientId,
                    senderId: requesterId,
                    type: 'FRIEND_REQUEST',
                    message: `<strong>${requester.name}</strong> đã gửi cho bạn một lời mời kết bạn.`,
                    link: `/profile/${requester.uuid}`,
                    iconUrl: requester.avatar,
                    transaction: t
                });
            }
            await t.commit();
            res.status(200).json({ success: true, message: "Đã gửi lời mời kết bạn." });
        } catch (error) {
            await t.rollback();
            handleServerError(res, error, "Gửi lời mời kết bạn");
        }
    }

    async acceptFriendRequest(req, res) {
        const accepterId = req.userId;
        const { friendId: requesterId } = req.body;
        const t = await db.sequelize.transaction();
        if (!accepterId || !requesterId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin.", accepterId, requesterId });
        }

        try {
            const friendRequest = await Friend.findOne({
                where: { userId: requesterId, friendId: accepterId, status: 'pending' },
                transaction: t
            });

            if (friendRequest) {
                friendRequest.status = 'accepted';
                await friendRequest.save({ transaction: t });
                
                const accepter = await User.findByPk(accepterId, { attributes: ['id', 'name', 'uuid', 'avatar'], transaction: t });
                const requester = await User.findByPk(requesterId, { attributes: ['id', 'uuid'], transaction: t }); 

                if (accepter && requester) {
                    await createAndEmitNotification({
                        recipientId: requesterId,
                        senderId: accepterId,
                        type: 'REQUEST_ACCEPTED',
                        message: `<strong>${accepter.name}</strong> đã chấp nhận lời mời kết bạn của bạn.`,
                        link: `/profile/${accepter.uuid}`,
                        iconUrl: accepter.avatar,
                        transaction: t
                    });
                }
                await t.commit();
                const friendInfo = await User.findByPk(requesterId, {
                    attributes: ['id', 'name', 'email', 'avatar', 'socialLinks', 'uuid']
                });
                res.status(200).json({ success: true, message: "Đã chấp nhận lời mời.", friend: friendInfo });
            } else {
                await t.rollback();
                res.status(404).json({ success: false, message: "Không tìm thấy lời mời kết bạn." });
            }
        } catch (error) {
            await t.rollback();
            handleServerError(res, error, "Chấp nhận lời mời kết bạn");
        }
    }

    async rejectFriendRequest(req, res) {
        const currentUserId = req.userId;
        const { friendId } = req.body;

        if (!currentUserId || !friendId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin." });
        }

        try {
            // Xóa lời mời mà người gửi là friendId và người nhận là currentUserId
            const deletedCount = await Friend.destroy({
                where: { userId: friendId, friendId: currentUserId, status: 'pending' }
            });
            if (deletedCount > 0) {
                res.status(200).json({ success: true, message: "Đã từ chối lời mời." });
            } else {
                res.status(404).json({ success: false, message: "Không tìm thấy lời mời để từ chối." });
            }
        } catch (error) {
            handleServerError(res, error, "Từ chối lời mời kết bạn");
        }
    }

    async cancelFriendRequest(req, res) {
        const currentUserId = req.userId; // Người gửi (đang đăng nhập)
        const { friendId } = req.body; // Người nhận từ body

        if (!currentUserId || !friendId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin." });
        }

        try {
            // Hủy lời mời mà currentUserId đã gửi cho friendId
            const deletedCount = await Friend.destroy({
                where: { userId: currentUserId, friendId: friendId, status: 'pending' }
            });
            if (deletedCount > 0) {
                res.status(200).json({ success: true, message: "Đã hủy lời mời kết bạn." });
            } else {
                res.status(404).json({ success: false, message: "Không tìm thấy lời mời để hủy." });
            }
        } catch (error) {
            handleServerError(res, error, "Hủy lời mời kết bạn");
        }
    }

    async removeFriend(req, res) {
        const currentUserId = req.userId;
        const { friendId } = req.body; // ID của người muốn hủy kết bạn

        if (!currentUserId || !friendId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin." });
        }

        try {
            // Xóa bản ghi friend bất kể ai là userId hay friendId
            const deletedCount = await Friend.destroy({
                where: {
                    status: 'accepted', // Chỉ xóa bạn bè đã accepted
                    [Op.or]: [
                        { userId: currentUserId, friendId: friendId },
                        { userId: friendId, friendId: currentUserId }
                    ]
                }
            });
            if (deletedCount > 0) {
                res.status(200).json({ success: true, message: "Đã hủy kết bạn thành công." });
            } else {
                res.status(404).json({ success: false, message: "Không tìm thấy mối quan hệ bạn bè này." });
            }
        } catch (error) {
            handleServerError(res, error, "Hủy kết bạn");
        }
    }

    // getFriends (Chuẩn hóa lỗi, tối ưu map)
    async getFriends(req, res) {
        const targetUserId = parseInt(req.params.userId, 10);
        const currentUserId = req.userId;

        if (isNaN(targetUserId)) {
            return res.status(400).json({ success: false, message: "UserID không hợp lệ." });
        }

        try {
            // Lấy danh sách ID bạn bè trước
            const friendships = await Friend.findAll({
                where: {
                    status: 'accepted',
                    [Op.or]: [{ userId: targetUserId }, { friendId: targetUserId }]
                },
                attributes: ['userId', 'friendId'] // Chỉ lấy ID để xác định bạn
            });

            const friendIds = friendships.map(fr => (fr.userId === targetUserId ? fr.friendId : fr.userId));

            // Lấy thông tin chi tiết của từng người bạn, bao gồm active items
            const friendsListPromises = friendIds.map(friendId =>
                User.findByPk(friendId, {
                    attributes: ['id', 'uuid', 'name', 'avatar', 'status', 'socialLinks'], // Các trường công khai cơ bản
                    // Không include UserInventory trực tiếp ở đây để tránh query phức tạp, sẽ lấy sau
                }).then(userInstance => getPublicUserInfoWithActiveItems(userInstance)) // Lấy thêm active items
            );
            const friendsList = (await Promise.all(friendsListPromises)).filter(Boolean); // Lọc bỏ null nếu có user không tìm thấy

            let friendRequestsList = [];
            let sentFriendRequestsList = [];

            if (currentUserId === targetUserId) { // Chỉ lấy lời mời nếu xem profile của chính mình
                const friendRequestsData = await Friend.findAll({
                    where: { friendId: currentUserId, status: 'pending' },
                    include: [{
                        model: User,
                        as: 'user', // User gửi lời mời
                        attributes: ['id', 'uuid', 'name', 'avatar', 'status', 'socialLinks']
                    }]
                });
                friendRequestsList = await Promise.all(
                    friendRequestsData.map(fr => getPublicUserInfoWithActiveItems(fr.user))
                ).then(results => results.filter(Boolean));


                const sentFriendRequestsData = await Friend.findAll({
                    where: { userId: currentUserId, status: 'pending' },
                    include: [{
                        model: User,
                        as: 'friend', // User nhận lời mời
                        attributes: ['id', 'uuid', 'name', 'avatar', 'status', 'socialLinks']
                    }]
                });
                sentFriendRequestsList = await Promise.all(
                    sentFriendRequestsData.map(fr => getPublicUserInfoWithActiveItems(fr.friend))
                ).then(results => results.filter(Boolean));
            }

            res.status(200).json({
                success: true,
                data: {
                    friends: friendsList,
                    friendRequests: friendRequestsList,
                    sentFriendRequests: sentFriendRequestsList,
                }
            });
        } catch (error) {
            handleServerError(res, error, "Lấy dữ liệu bạn bè");
        }
    }

    async getMovieRecommendations(req, res) {
        const userId = req.userId;
        const limit = parseInt(req.query.limit || '10', 10); // Số lượng phim đề xuất

        try {
            const genrePreferences = await getGenrePreferences(userId);

            if (genrePreferences.length === 0) {
                // Nếu không có lịch sử xem, đề xuất phim mới nhất hoặc phổ biến chung
                const popularMovies = await Movie.findAll({
                    order: [['views', 'DESC']], // Ví dụ: phổ biến theo views
                    limit: limit,
                    include: [ /* ... các include cần thiết cho card phim ... */
                        { model: Genre, as: 'genres', attributes: ['id', 'title', 'slug'], through: { attributes: [] } },
                        { model: Episode, as: 'Episodes', attributes: ['id', 'episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 }
                    ]
                });
                return res.status(200).json({ success: true, recommendations: popularMovies, message: "Phim phổ biến" });
            }

            // Lấy top N thể loại ưa thích (ví dụ: top 3)
            const topGenreIds = genrePreferences.slice(0, 3).map(g => g.id);

            // Lấy ID các phim đã xem để loại trừ
            const watchedMovieIds = (await WatchHistory.findAll({
                where: { userId },
                include: [{ model: Episode, as: 'episode', attributes: ['movieId'] }]
            })).map(wh => wh.episode?.movieId).filter(id => id != null);

            // Tìm phim thuộc các thể loại ưa thích, chưa xem, sắp xếp theo tiêu chí (ví dụ: mới nhất)
            const recommendedMovies = await Movie.findAll({
                include: [
                    {
                        model: Genre,
                        as: 'genres',
                        attributes: ['id', 'title', 'slug'],
                        where: { id: { [Op.in]: topGenreIds } },
                        through: { attributes: [] },
                        required: true // Chỉ lấy phim có ít nhất 1 trong các thể loại này
                    },
                    // Các include khác cần cho hiển thị card phim
                    { model: Episode, as: 'Episodes', attributes: ['id', 'episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 },
                    { model: Category, as: 'categories', attributes: ['id', 'title'] },
                    { model: Country, as: 'countries', attributes: ['id', 'title'] }
                ],
                where: {
                    id: { [Op.notIn]: watchedMovieIds } // Loại trừ phim đã xem
                },
                order: [
                    ['createdAt', 'DESC'], // Ưu tiên phim mới nhất
                    ['views', 'DESC']      // Sau đó là phim nhiều view
                ],
                limit: limit,
                distinct: true, // Cần thiết khi include many-to-many và limit
                subQuery: false // Có thể cần cho limit/offset với include phức tạp
            });

            res.status(200).json({ success: true, recommendations: recommendedMovies });

        } catch (error) {
            handleServerError(res, error, "Lấy phim đề xuất");
        }
    }

    async getLeaderboard(req, res) {
        const limit = parseInt(req.query.limit) || 10; // Số lượng user trên mỗi trang
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        // Tiêu chí sắp xếp: 'points', 'level', 'movies_watched', 'comments_count'
        const sortBy = req.query.sortBy || 'points'; // Mặc định theo điểm

        const orderOptions = [];
        const includeOptions = [
            {
                model: Role,
                as: 'roles',
                attributes: ['name'],
                through: { attributes: [] }
            }
        ];
        const attributes = ['id', 'uuid', 'name', 'avatar', 'points', 'level', 'createdAt']; // Các trường cơ bản

        switch (sortBy) {
            case 'level':
                orderOptions.push(['level', 'DESC']);
                orderOptions.push(['points', 'DESC']); // Nếu cùng level, xếp theo điểm
                break;
            case 'movies_watched':
                attributes.push([
                    Sequelize.literal(`(
                        SELECT COUNT(DISTINCT \`Episode\`.\`movieId\`)
                        FROM \`watch_histories\` AS \`wh\`
                        INNER JOIN \`Episodes\` AS \`Episode\` ON \`wh\`.\`episodeId\` = \`Episode\`.\`id\`
                        WHERE \`wh\`.\`userId\` = \`users\`.\`id\`
                    )`),
                    'moviesWatchedCount'
                ]);
                orderOptions.push([Sequelize.col('moviesWatchedCount'), 'DESC']);
                orderOptions.push(['points', 'DESC']); // Fallback sort
                break;
            case 'comments_count':
                // Đếm số bình luận gốc
                attributes.push([
                    Sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM \`comments\` AS \`cmt\`
                        WHERE \`cmt\`.\`userId\` = \`users\`.\`id\` AND \`cmt\`.\`parentId\` IS NULL
                    )`),
                    'commentsCount'
                ]);
                orderOptions.push([Sequelize.col('commentsCount'), 'DESC']);
                orderOptions.push(['points', 'DESC']); // Fallback sort
                break;
            case 'points':
            default:
                orderOptions.push(['points', 'DESC']);
                orderOptions.push(['level', 'DESC']); // Nếu cùng điểm, xếp theo level
                break;
        }
        // Luôn thêm một tiêu chí sắp xếp cuối cùng để đảm bảo thứ tự nhất quán
        orderOptions.push(['createdAt', 'ASC']);
        try {
            const { count, rows: users } = await User.findAndCountAll({
                attributes: attributes,
                include: includeOptions,
                where: {
                    status: { [Op.ne]: 0 } // Ví dụ: chỉ user active
                },
                order: orderOptions,
                limit: limit,
                offset: offset,
                distinct: true, // Quan trọng khi có include many-to-many
                // subQuery: false // Có thể cần nếu order by aggregated field phức tạp
            });
            const filteredUsers = users.filter(user => {
                const userRoles = user.roles ? user.roles.map(r => r.name) : [];
                return !userRoles.includes('admin') && !userRoles.includes('editor');
            });
            // Sử dụng users gốc từ DB nếu lọc ở DB, hoặc filteredUsers nếu lọc ở app level
            const usersToFormat = filteredUsers; // Hoặc filteredUsers nếu bạn chọn lọc ở app
            const finalCount = usersToFormat.length; // Hoặc `count` nếu không lọc ở app
            const totalPages = Math.ceil(finalCount / limit);

            // Format lại user data nếu cần
            const formattedUsers = users.map(user => {
                const userData = user.toJSON(); // Chuyển sang plain object
                return {
                    id: userData.id,
                    uuid: userData.uuid,
                    name: userData.name,
                    avatar: userData.avatar,
                    points: userData.points,
                    level: userData.level,
                    roles: userData.roles ? userData.roles.map(r => r.name) : [],
                    createdAt: userData.createdAt,
                    // Thêm các trường count nếu có
                    moviesWatchedCount: userData.moviesWatchedCount,
                    commentsCount: userData.commentsCount,
                };
            });

            res.status(200).json({
                success: true,
                users: usersToFormat,
                pagination: {
                    totalItems: finalCount, //Sử dụng count đã điều chỉnh
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit,
                    sortBy
                }
            });
        } catch (error) {
            handleServerError(res, error, "Lấy bảng xếp hạng người dùng");
        }
    }

    async updatePrivacySettings(req, res) {
        const userId = req.userId;
        const { showFriendsList, showTimeline } = req.body;

        const validSettings = ['public', 'friends', 'private'];
        if ((showFriendsList && !validSettings.includes(showFriendsList)) ||
            (showTimeline && !validSettings.includes(showTimeline))) {
            return res.status(400).json({ success: false, message: "Giá trị cài đặt không hợp lệ." });
        }

        try {
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
            }

            const currentPrivacy = user.privacySettings || { showFriendsList: 'public', showTimeline: 'public' };
            const newPrivacy = {
                showFriendsList: showFriendsList || currentPrivacy.showFriendsList,
                showTimeline: showTimeline || currentPrivacy.showTimeline,
            };

            user.privacySettings = newPrivacy;
            await user.save();

            res.status(200).json({ success: true, message: "Cập nhật cài đặt riêng tư thành công.", privacySettings: newPrivacy });
        } catch (error) {
            handleServerError(res, error, "Cập nhật cài đặt riêng tư");
        }
    }
}