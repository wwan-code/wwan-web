// backend/controllers/challenge.controller.js
import db from '../models/index.js';
import { handleServerError } from '../utils/errorUtils.js';
import { Op } from 'sequelize';

const Challenge = db.Challenge;
const UserChallengeProgress = db.UserChallengeProgress;
const User = db.User;
const Badge = db.Badge;
const ShopItem = db.ShopItem;

// --- USER FACING ---
export const getAvailableChallenges = async (req, res) => {
    const userId = req.userId; // Từ authJwt.getUser
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const userLevel = userId ? (await User.findByPk(userId, { attributes: ['level'] }))?.level || 1 : 1;

        const { count, rows: challenges } = await Challenge.findAndCountAll({
            where: {
                isActive: true,
                requiredLevel: { [Op.lte]: userLevel }, // Chỉ lấy challenge user đủ level
                // (Tùy chọn) Lọc các challenge có endDate trong tương lai hoặc null
                [Op.or]: [
                    { endDate: null },
                    { endDate: { [Op.gte]: new Date() } }
                ]
            },
            include: [
                // Nếu user đăng nhập, lấy tiến độ của họ
                ...(userId ? [{
                    model: UserChallengeProgress,
                    as: 'userProgressEntries', // Hoặc alias bạn đặt
                    where: { userId },
                    required: false, // LEFT JOIN để vẫn hiển thị challenge dù user chưa tham gia
                    attributes: ['id', 'currentCount', 'status', 'completedAt', 'startedAt']
                }] : []),
                { model: Badge, as: 'rewardBadge', attributes: ['id', 'name', 'iconUrl', 'description'] },
                { model: ShopItem, as: 'rewardShopItem', attributes: ['id', 'name', 'iconUrl', 'type'] }
            ],
            order: [['createdAt', 'DESC']], // Hoặc theo endDate, startDate
            limit,
            offset,
            distinct: true, // Quan trọng khi có include N-M hoặc hasMany
        });

        const totalPages = Math.ceil(count / limit);

        // Xử lý để mỗi challenge chỉ có một entry progress của user (nếu có)
        const results = challenges.map(ch => {
            const challengeJson = ch.toJSON();
            if (challengeJson.userProgressEntries && challengeJson.userProgressEntries.length > 0) {
                challengeJson.userProgress = challengeJson.userProgressEntries[0]; // Lấy entry đầu tiên (thường là duy nhất cho user/challenge chưa completed)
            }
            delete challengeJson.userProgressEntries;
            return challengeJson;
        });

        res.status(200).json({
            success: true,
            challenges: results,
            pagination: { totalItems: count, totalPages, currentPage: page, itemsPerPage: limit }
        });
    } catch (error) {
        handleServerError(res, error, "Lấy danh sách thử thách");
    }
};

// (Tùy chọn) User tham gia một thử thách
export const joinChallenge = async (req, res) => {
    const userId = req.userId;
    const { challengeId } = req.params;
    const t = await db.sequelize.transaction();
    try {
        const challenge = await Challenge.findByPk(challengeId, { transaction: t });
        if (!challenge || !challenge.isActive) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Thử thách không tồn tại hoặc không hoạt động." });
        }
        const user = await User.findByPk(userId, { attributes: ['level'], transaction: t });
        if (user.level < challenge.requiredLevel) {
            await t.rollback();
            return res.status(403).json({ success: false, message: "Bạn chưa đủ cấp độ để tham gia thử thách này." });
        }

        // Kiểm tra xem user đã tham gia hoặc hoàn thành chưa (nếu không repeatable)
        const existingProgress = await UserChallengeProgress.findOne({
            where: { userId, challengeId },
            transaction: t
        });

        if (existingProgress && (existingProgress.status === 'COMPLETED' || existingProgress.status === 'CLAIMED') && !challenge.isRepeatable) {
            await t.rollback();
            return res.status(409).json({ success: false, message: "Bạn đã hoàn thành thử thách này rồi." });
        }
        if (existingProgress && existingProgress.status === 'IN_PROGRESS') {
            await t.rollback();
            return res.status(409).json({ success: false, message: "Bạn đang tham gia thử thách này rồi." });
        }
        // Nếu FAILED và repeatable, có thể cho join lại (cần logic reset progress)

        const newProgress = await UserChallengeProgress.create({
            userId,
            challengeId,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            progressDetails: {} // Khởi tạo progressDetails rỗng
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, message: `Bạn đã tham gia thử thách "${challenge.title}"!`, progress: newProgress });

    } catch (error) {
        await t.rollback();
        handleServerError(res, error, "Tham gia thử thách");
    }
};


// --- ADMIN ---
export const adminCreateChallenge = async (req, res) => {
    const { title, slug, description, type, targetCount, criteria, pointsReward, badgeIdReward, shopItemIdReward, startDate, endDate, durationForUserDays, isActive, isRepeatable, repeatIntervalDays, requiredLevel, coverImageUrl } = req.body;
    if (!title || !description || !type || !targetCount) {
        return res.status(400).json({ success: false, message: "Các trường title, description, type, targetCount là bắt buộc." });
    }
    try {
        const newChallenge = await Challenge.create({
            title, slug, description, type, targetCount: parseInt(targetCount, 10),
            criteria: criteria || {}, // Đảm bảo criteria là object
            pointsReward: parseInt(pointsReward, 10) || 0,
            badgeIdReward: badgeIdReward || null,
            shopItemIdReward: shopItemIdReward || null,
            startDate: startDate || null,
            endDate: endDate || null,
            durationForUserDays: durationForUserDays ? parseInt(durationForUserDays) : null,
            isActive: isActive === undefined ? true : !!isActive,
            isRepeatable: !!isRepeatable,
            repeatIntervalDays: repeatIntervalDays ? parseInt(repeatIntervalDays) : null,
            requiredLevel: parseInt(requiredLevel, 10) || 1,
            coverImageUrl
        });
        res.status(201).json({ success: true, challenge: newChallenge });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ success: false, message: "Tên hoặc slug của thử thách đã tồn tại." });
        }
        handleServerError(res, error, "Admin tạo thử thách");
    }
};

export const adminGetChallenges = async (req, res) => {
    // Thêm phân trang, filter cho admin nếu cần
    try {
        const challenges = await Challenge.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({ success: true, challenges });
    } catch (error) { handleServerError(res, error, "Admin lấy danh sách thử thách"); }
};

export const adminGetChallengeById = async (req, res) => {
    try {
        const challenge = await Challenge.findByPk(req.params.id, {
            include: [
                { model: Badge, as: 'rewardBadge' },
                { model: ShopItem, as: 'rewardShopItem' }
            ]
        });
        if (!challenge) return res.status(404).json({ success: false, message: "Không tìm thấy thử thách." });
        res.status(200).json({ success: true, challenge });
    } catch (error) { handleServerError(res, error, "Admin lấy chi tiết thử thách"); }
};

export const adminUpdateChallenge = async (req, res) => {
    const { id } = req.params;
    // Lấy các trường từ req.body tương tự như adminCreateChallenge
    const { title, slug, description, type, targetCount, criteria, /* ... */ } = req.body;
    try {
        const challenge = await Challenge.findByPk(id);
        if (!challenge) return res.status(404).json({ success: false, message: "Không tìm thấy thử thách." });

        await challenge.update({ /* ... các trường cần cập nhật ... */ title, slug, description });
        res.status(200).json({ success: true, challenge });
    } catch (error) { /* ... xử lý lỗi unique, ... */ handleServerError(res, error, "Admin cập nhật thử thách"); }
};

export const adminDeleteChallenge = async (req, res) => {
    const { id } = req.params;
    try {
        const challenge = await Challenge.findByPk(id);
        if (!challenge) return res.status(404).json({ success: false, message: "Không tìm thấy thử thách." });
        // Cân nhắc: xóa cả UserChallengeProgress liên quan? (Model đã có onDelete: 'CASCADE')
        await challenge.destroy();
        res.status(200).json({ success: true, message: "Đã xóa thử thách." });
    } catch (error) { handleServerError(res, error, "Admin xóa thử thách"); }
};