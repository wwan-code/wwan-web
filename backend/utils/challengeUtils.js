// backend/services/challengeUtils.js
import db from '../models/index.js';
import { Op } from 'sequelize';
import { awardPoints, checkAndAwardBadges } from '../utils/gamificationUtils.js';
import { createAndEmitNotification } from '../utils/notificationUtils.js';

const User = db.User;
const Challenge = db.Challenge;
const UserChallengeProgress = db.UserChallengeProgress;
const WatchHistory = db.WatchHistory;
const Movie = db.Movie;
const Genre = db.Genre;

// Hàm này sẽ được gọi sau mỗi hành động liên quan của người dùng
export const processUserActionForChallenges = async (userId, actionType, actionData, transaction) => {
    console.log(`[ChallengeService] Processing action: ${actionType} for user ${userId}`, actionData);
    try {
        const activeUserProgresses = await UserChallengeProgress.findAll({
            where: { userId, status: 'IN_PROGRESS' },
            include: [{ model: Challenge, as: 'challengeDetails', where: { isActive: true } }],
            transaction
        });

        if (!activeUserProgresses || activeUserProgresses.length === 0) {
            console.log(`[ChallengeService] User ${userId} has no active challenges in progress.`);
            return;
        }

        for (const progress of activeUserProgresses) {
            const challenge = progress.challengeDetails;
            if (!challenge) continue;

            // Kiểm tra xem thử thách có bị giới hạn thời gian kể từ lúc user join không
            if (challenge.durationForUserDays) {
                const startedAt = new Date(progress.startedAt);
                const deadline = new Date(startedAt.setDate(startedAt.getDate() + challenge.durationForUserDays));
                if (new Date() > deadline) {
                    console.log(`[ChallengeService] Challenge ${challenge.id} for user ${userId} has expired.`);
                    progress.status = 'FAILED';
                    await progress.save({ transaction });
                    continue; // Chuyển sang thử thách tiếp theo
                }
            }
             // Kiểm tra endDate của thử thách chung
            if (challenge.endDate && new Date(challenge.endDate) < new Date()) {
                console.log(`[ChallengeService] Challenge ${challenge.id} (general) has ended.`);
                progress.status = 'FAILED'; // Hoặc để nguyên IN_PROGRESS nếu không muốn FAILED ngay
                await progress.save({ transaction });
                continue;
            }


            let criteriaMetForThisAction = false;
            let itemIdentifier = null; // ID của phim/truyện/chương đã hoàn thành

            // --- LOGIC KIỂM TRA CHO TỪNG LOẠI THỬ THÁCH ---
            switch (challenge.type) {
                case 'WATCH_X_MOVIES':
                    if (actionType === 'episode_watched' && actionData.movieId) {
                        itemIdentifier = `movie_${actionData.movieId}`;
                        criteriaMetForThisAction = true; // Chỉ cần xem 1 tập là tính cho phim đó
                    }
                    break;
                case 'WATCH_X_EPISODES':
                     if (actionType === 'episode_watched' && actionData.episodeId) {
                        itemIdentifier = `episode_${actionData.episodeId}`; // Mỗi tập là một mục riêng
                        criteriaMetForThisAction = true;
                    }
                    break;
                case 'WATCH_GENRE_MOVIES':
                    if (actionType === 'episode_watched' && actionData.movieId && challenge.criteria?.genreIds) {
                        const movie = await Movie.findByPk(actionData.movieId, {
                            include: [{ model: Genre, as: 'genres', attributes: ['id'] }],
                            transaction
                        });
                        if (movie) {
                            const movieGenreIds = movie.genres.map(g => g.id);
                            if (challenge.criteria.genreIds.some(gid => movieGenreIds.includes(gid))) {
                                itemIdentifier = `movie_${actionData.movieId}`;
                                criteriaMetForThisAction = true;
                            }
                        }
                    }
                    break;
                // Thêm các case cho: READ_X_COMICS, READ_X_CHAPTERS, RATE_X_MOVIES, DAILY_LOGIN_STREAK, etc.
                // Ví dụ cho DAILY_LOGIN_STREAK (sẽ được trigger bởi hàm checkIn hàng ngày)
                case 'DAILY_LOGIN_STREAK':
                    if (actionType === 'daily_check_in' && actionData.currentStreak) {
                        // Với daily streak, currentCount chính là số ngày streak
                        progress.currentCount = actionData.currentStreak;
                        criteriaMetForThisAction = false; // Sẽ không tăng count qua itemIdentifier
                        if (progress.currentCount >= challenge.targetCount) {
                             criteriaMetForThisAction = true; // Đánh dấu để hoàn thành
                        }
                        // Không cần progressDetails cho loại này
                    }
                    break;

                default:
                    console.warn(`[ChallengeService] Unknown challenge type: ${challenge.type}`);
                    continue; // Bỏ qua thử thách này
            }

            if (criteriaMetForThisAction) {
                let details = progress.progressDetails || {};
                let completedItems = [];
                if (itemIdentifier) { // Chỉ áp dụng cho các challenge dựa trên item cụ thể
                    const detailKey = challenge.type.includes('MOVIE') || challenge.type.includes('EPISODE') ? 'completedMovieOrEpisodeIds' : 'completedComicOrChapterIds';
                    completedItems = details[detailKey] || [];
                    if (!completedItems.includes(itemIdentifier)) {
                        completedItems.push(itemIdentifier);
                        details[detailKey] = completedItems;
                        progress.currentCount = (progress.currentCount || 0) + 1;
                        progress.progressDetails = details;
                    } else {
                        // Item này đã được tính, không tăng currentCount
                        console.log(`[ChallengeService] Item ${itemIdentifier} already counted for challenge ${challenge.id}, user ${userId}`);
                        continue; // Chuyển sang thử thách tiếp theo
                    }
                }


                if (progress.currentCount >= challenge.targetCount) {
                    progress.status = 'COMPLETED';
                    progress.completedAt = new Date();
                    console.log(`[ChallengeService] User ${userId} COMPLETED challenge ${challenge.id}: ${challenge.title}`);
                    // Gọi hàm trao thưởng
                    await completeAndAwardChallenge(userId, challenge, progress, transaction);
                }
                await progress.save({ transaction });
            }
        }
    } catch (error) {
        console.error(`[ChallengeService] Error processing actions for user ${userId}:`, error);
        // Không throw lỗi để không làm dừng các tiến trình khác, nhưng cần log kỹ
    }
};

// Hàm xử lý khi thử thách hoàn thành và trao thưởng
export const completeAndAwardChallenge = async (userId, challengeInstance, progressInstance, transaction) => {
    try {
        const user = await User.findByPk(userId, { transaction });
        if (!user) return;

        let rewardsGiven = false;

        // 1. Cộng điểm
        if (challengeInstance.pointsReward > 0) {
            await awardPoints(userId, challengeInstance.pointsReward, {
                transaction,
                description: `Hoàn thành thử thách: ${challengeInstance.title}`
            });
            rewardsGiven = true;
        }

        // 2. Trao huy hiệu
        if (challengeInstance.badgeIdReward) {
            const [userBadge, created] = await db.UserBadge.findOrCreate({
                where: { userId, badgeId: challengeInstance.badgeIdReward },
                defaults: { userId, badgeId: challengeInstance.badgeIdReward, earnedAt: new Date() },
                transaction
            });
            if (created) rewardsGiven = true;
        }

        // 3. Trao vật phẩm cửa hàng
        if (challengeInstance.shopItemIdReward) {
            const shopItem = await db.ShopItem.findByPk(challengeInstance.shopItemIdReward, { transaction });
            if (shopItem) {
                let expiresAt = null;
                if (shopItem.durationDays) {
                    expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + shopItem.durationDays);
                }
                // Logic tương tự purchase, nhưng không trừ điểm và không check stock/level
                const [invEntry, invCreated] = await db.UserInventory.findOrCreate({
                    where: { userId, shopItemId: shopItem.id, expiresAt: expiresAt },
                    defaults: { userId, shopItemId: shopItem.id, expiresAt, quantity: 1, isActive: false },
                    transaction
                });
                if (!invCreated && shopItem.type === 'AD_SKIP_TICKET') { // Nếu là vé thì cộng dồn
                    invEntry.quantity +=1;
                    await invEntry.save({transaction});
                }
                if (invCreated || shopItem.type === 'AD_SKIP_TICKET') rewardsGiven = true;
            }
        }

        // 4. Tạo thông báo hoàn thành thử thách
        if (rewardsGiven) { // Chỉ thông báo nếu có phần thưởng thực sự
            await createAndEmitNotification({
                recipientId: userId,
                type: 'CHALLENGE_COMPLETED',
                message: `Chúc mừng! Bạn đã hoàn thành thử thách "<strong>${challengeInstance.title}</strong>" và nhận được phần thưởng!`,
                link: `/profile/${user.uuid}?tab=challenges`, // Link đến trang thử thách của user
                iconUrl: challengeInstance.coverImageUrl || 'fas fa-trophy text-warning', // Icon thử thách hoặc icon chung
                transaction
            });
        }

        // Cập nhật trạng thái progress (có thể là CLAIMED nếu cần user nhận)
        // Hiện tại để COMPLETED là đủ
        progressInstance.status = 'COMPLETED'; // Hoặc 'REWARD_CLAIMED' nếu có bước nhận riêng
        progressInstance.completedAt = new Date();
        // Không cần save progressInstance ở đây nữa vì nó đã được save ở hàm gọi
        console.log(`[ChallengeService] Rewards processed for challenge ${challengeInstance.id}, user ${userId}`);

    } catch (error) {
        console.error(`[ChallengeService] Lỗi khi trao thưởng thử thách ${challengeInstance.id} cho user ${userId}:`, error);
        // Ghi log lỗi, không throw để transaction chính có thể tiếp tục nếu cần
    }
};