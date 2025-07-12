// utils/gamificationUtils.js
import { Op } from 'sequelize';
import { getIo } from '../config/socket.js';
import Badge from '../models/Badge.js';
import db from '../models/index.js';
import { autoGrantAvatarFrame, autoGrantChatColor } from './autoGrantAvatarFrame.js';

const User = db.User;
const UserBadge = db.UserBadge;
const Comment = db.Comment;
const Episode = db.Episode;
const Movie = db.Movie;
const Genre = db.Genre;
const WatchHistory = db.WatchHistory;
const Watchlist = db.Watchlist;
const Rating = db.Rating;
const Notification = db.Notification;

const LEVEL_THRESHOLDS = [
    { level: 1, points: 0 },
    { level: 2, points: 500 },
    { level: 3, points: 1500 },
    { level: 4, points: 3000 },
    { level: 5, points: 5000 },
    { level: 6, points: 7500 },
    { level: 7, points: 11000 },
    { level: 8, points: 15000 },
    { level: 9, points: 20000 },
    { level: 10, points: 26000 },
    { level: 11, points: 33000 },
    { level: 12, points: 41000 },
    { level: 13, points: 50000 },
    { level: 14, points: 60000 },
    { level: 15, points: 71000 },
    { level: 16, points: 83000 },
    { level: 17, points: 96000 },
    { level: 18, points: 110000 },
    { level: 19, points: 125000 },
    { level: 20, points: 141000 },
    { level: 21, points: 158000 },
    { level: 22, points: 176000 },
    { level: 23, points: 195000 },
    { level: 24, points: 215000 },
    { level: 25, points: 236000 },
    { level: 26, points: 258000 },
    { level: 27, points: 281000 },
    { level: 28, points: 305000 },
    { level: 29, points: 330000 },
    { level: 30, points: 356000 }
];

/**
* Cộng điểm cho người dùng và kiểm tra lên cấp.
* @param {number} userId - ID của người dùng.
* @param {number} pointsToAdd - Số điểm cần cộng.
* @param {Sequelize.Transaction} [transaction] - Transaction.
* @returns {Promise<{user: User, newLevel: number|null}>} - Trả về user đã cập nhật và cấp độ mới nếu có.
*/
export const awardPoints = async (userId, pointsToAdd, transaction = null) => {

    if (!userId || typeof pointsToAdd !== 'number' || pointsToAdd <= 0) {
        return null;
    }
    try {
        const user = await User.findOne({ where: { id: userId }, transaction });
        if (!user) {
            return null;
        }

        const oldLevel = user.level;
        user.points += pointsToAdd;
        let newLevel = null;

        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (user.points >= LEVEL_THRESHOLDS[i].points && user.level < LEVEL_THRESHOLDS[i].level) {
                user.level = LEVEL_THRESHOLDS[i].level;
                newLevel = user.level;
                break;
            }
        }

        await user.save({ transaction });

        await checkAndAwardBadges(user, { eventType: 'points_updated' }, transaction);

        const io = getIo();
        if (io) {
            const userRoom = `user_${userId}`;
            io.to(userRoom).emit('userStatsUpdated', {
                userId: userId,
                points: user.points,
                level: user.level,
                newLevelReached: newLevel
            });
            if (newLevel && newLevel > oldLevel) {
                // await autoGrantAvatarFrame(user.id, newLevel, transaction);
                await autoGrantChatColor(user.id, newLevel, transaction);
                const levelUpNotification = await Notification.create({
                    recipientId: userId,
                    type: 'LEVEL_UP',
                    message: `Chúc mừng bạn đã đạt cấp độ ${newLevel}!`,
                    link: '/profile#badges',
                    isRead: false,
                }, { transaction });
                const unreadCount = await Notification.count({ where: { recipientId: userId, isRead: false }, transaction });
                io.to(userRoom).emit('newNotification', {
                    notification: levelUpNotification.toJSON(),
                    unreadCount: unreadCount + 1
                });
            }
        }

        return { user, newLevel };
    } catch (error) {
        console.error(`[Gamification] Error awarding points to user ${userId}:`, error);
        return null;
    }
};

/**
* Kiểm tra và trao huy hiệu cho người dùng.
* @param {User} userInstance - Instance User đã cập nhật.
* @param {object} eventData - Dữ liệu về sự kiện gây ra việc kiểm tra huy hiệu.
* @param {Sequelize.Transaction} [transaction] - Transaction.
* Ví dụ: { eventType: 'new_comment', userId }
* { eventType: 'new_rating', userId }
* { eventType: 'episode_watched', userId }
* { eventType: 'daily_check_in', userId, currentDailyStreak }
* { eventType: 'watchlist_created', userId }
* { eventType: 'points_updated', points, level, newLevelAwarded, userId } (gọi từ awardPoints)
*/
export const checkAndAwardBadges = async (userInstance, eventData = {}, transaction = null) => {
    const userId = userInstance.id;
    if (!userId) return;

    try {
        const allPossibleBadges = await Badge.findAll({ transaction });
        const userEarnedBadgeIds = (await userInstance.getBadges({
            attributes: ['id'],
            transaction
        })).map(b => b.id);

        for (const badge of allPossibleBadges) {
            if (userEarnedBadgeIds.includes(badge.id)) {
                continue;
            }

            let conditionMet = false;
            let userStatValue = 0;
            const currentPoints = userInstance.points;
            const currentLevel = userInstance.level;

            switch (badge.criteriaType) {
                case 'level':
                    if (eventData.eventType === 'points_updated' || eventData.eventType === 'user_registered') {
                        userStatValue = currentLevel;
                        if (currentLevel >= badge.criteriaValue) {
                            conditionMet = true;
                        }
                    }
                    break;
                case 'points':
                    if (eventData.eventType === 'points_updated') {
                        userStatValue = currentPoints;
                        if (currentPoints >= badge.criteriaValue) {
                            conditionMet = true;
                        }
                    }
                    break;
                case 'comments':
                    if (eventData.eventType === 'new_comment') {
                        userStatValue = await Comment.count({
                            where: { userId, parentId: null },
                            transaction
                        });
                        if (userStatValue >= badge.criteriaValue) conditionMet = true;
                    }
                    break;
                case 'ratings_count':
                    if (eventData.eventType === 'new_rating') {
                        userStatValue = await Rating.count({
                            where: { userId },
                            transaction
                        });
                        if (userStatValue >= badge.criteriaValue) conditionMet = true;
                    }
                    break;
                case 'episodes_watched':
                    if (eventData.eventType === 'episode_watched') {
                        userStatValue = await WatchHistory.count({
                            where: { userId },
                            distinct: true,
                            col: 'episodeId',
                            transaction
                        });
                        if (userStatValue >= badge.criteriaValue) conditionMet = true;
                    }
                    break;
                case 'movies_watched':
                    if (eventData.eventType === 'episode_watched') {
                        const uniqueMovies = await db.sequelize.query(
                            `SELECT COUNT(DISTINCT "Episode"."movieId") as count FROM "watch_histories" AS "WatchHistory" INNER JOIN "Episodes" AS "Episode" ON "WatchHistory"."episodeId" = "Episode"."id" WHERE "WatchHistory"."userId" = ${userId}`,
                            {
                                type: db.sequelize.QueryTypes.SELECT,
                                transaction
                            }
                        );
                        userStatValue = uniqueMovies[0] ? parseInt(uniqueMovies[0].count, 10) : 0;
                        if (userStatValue >= badge.criteriaValue) conditionMet = true;
                    }
                    break;
                case 'daily_check_in_streak':
                    if (eventData.eventType === 'daily_check_in' && eventData.currentDailyStreak !== undefined) {
                        userStatValue = eventData.currentDailyStreak;
                        if (eventData.currentDailyStreak >= badge.criteriaValue) {
                            conditionMet = true;
                        }
                    }
                    break;
                case 'late_night_watcher':
                    if (eventData.eventType === 'episode_watched') {
                        const lateNightWatches = await WatchHistory.findAll({
                            where: {
                                userId,
                                watchedAt: {
                                    [Op.and]: [
                                        db.sequelize.where(db.sequelize.fn('HOUR', db.sequelize.col('watchedAt')), { [Op.gte]: 0 }),
                                        db.sequelize.where(db.sequelize.fn('HOUR', db.sequelize.col('watchedAt')), { [Op.lt]: 6 })
                                    ]
                                }
                            },
                            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.fn('DATE', db.sequelize.col('watchedAt'))), 'watchDate']],
                            group: [db.sequelize.fn('DATE', db.sequelize.col('watchedAt'))],
                            transaction
                        });
                        userStatValue = lateNightWatches.length;
                        if (userStatValue >= badge.criteriaValue) conditionMet = true;
                    }
                    break;
                case 'genre_explorer':
                    if (eventData.eventType === 'episode_watched') {
                        const watchedGenres = await WatchHistory.findAll({
                            where: { userId },
                            include: [{
                                model: Episode,
                                attributes: ['id', 'movieId'],
                                include: [{
                                    model: Movie,
                                    attributes: ['id', 'type'],
                                    include: [{
                                        model: Genre,
                                        as: 'genres',
                                        attributes: ['id'],
                                        through: { attributes: [] },
                                    }]
                                }]
                            }],
                            transaction
                        });

                        const uniqueGenreIds = new Set();
                        watchedGenres.forEach(wh => {
                            const genres = wh.Episode?.Movie?.genres || wh.Episode?.movie?.genres;
                            if (Array.isArray(genres)) {
                                genres.forEach(genre => uniqueGenreIds.add(genre.id));
                            }
                        });
                        userStatValue = uniqueGenreIds.size;
                        if (userStatValue >= badge.criteriaValue) {
                            conditionMet = true;
                        }
                    }
                    break;
                case 'watchlist_count':
                    if (eventData.eventType === 'watchlist_created') {
                        userStatValue = await Watchlist.count({
                            where: { userId },
                            transaction
                        });
                        if (userStatValue >= badge.criteriaValue) conditionMet = true;
                    }
                    break;
                case 'other':
                    if (badge.name === 'Người Tiên Phong' && userId <= badge.criteriaValue) {
                        conditionMet = true; userStatValue = userId;
                    }
                    break;
            }

            if (conditionMet) {
                await UserBadge.create({ userId, badgeId: badge.id }, { transaction });
                const newBadgeNotification = await Notification.create({
                    recipientId: userId,
                    type: 'NEW_BADGE',
                    message: `Chúc mừng! Bạn đã nhận được huy hiệu "${badge.name}".`,
                    link: '/profile#badges',
                    iconUrl: badge.iconUrl,
                    isRead: false,
                }, { transaction });
                const io = getIo();
                if (io) {
                    const userRoom = `user_${userId}`;
                    const unreadCount = await Notification.count({
                        where: { recipientId: userId, isRead: false },
                        transaction
                    });
                    io.to(userRoom).emit('newNotification', {
                        notification: newBadgeNotification.toJSON(),
                        unreadCount: unreadCount + 1
                    });
                }
            }
        }
    } catch (error) {
        console.error(`[Gamification] Error checking/awarding badges for user ${userId}:`, error);
        throw error;
    }
};