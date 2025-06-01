import { Op } from 'sequelize';
import db from '../models/index.js';
import { handleServerError } from "../utils/errorUtils.js";
import { awardPoints, checkAndAwardBadges } from '../utils/gamificationUtils.js';
import { createAndEmitNotification } from '../utils/notificationUtils.js';
import { processUserActionForChallenges } from '../utils/challengeUtils.js';
const Rating = db.Rating;
const User = db.User;
const Movie = db.Movie;
const Friend = db.Friend;

const POINTS_FOR_RATING = 15;

// Hàm tạo hoặc cập nhật rating/review
export const createOrUpdateRatingReview = async (req, res) => {
    const userId = req.userId;
    const { movieId, rating, reviewContent } = req.body;
    const t = await db.sequelize.transaction();
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!movieId || rating === undefined) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin movieId hoặc rating.' });
    }
    if (rating < 1 || rating > 10) {
        return res.status(400).json({ success: false, message: 'Điểm rating phải từ 1 đến 10.' });
    }

    try {
        const userWhoRated = await User.findByPk(userId, { attributes: ['id', 'name', 'uuid', 'avatar'], transaction: t });
        if (!userWhoRated) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
        }
        const ratedMovie = await Movie.findByPk(movieId, { attributes: ['id', 'title', 'slug', 'poster'], transaction: t });
        if (!ratedMovie) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Phim không tồn tại.' });
        }
        const [ratingInstance, created] = await Rating.findOrCreate({
            where: { userId, movieId },
            defaults: {
                userId,
                movieId,
                rating,
                reviewContent: reviewContent || null,
                isApproved: true
            }
        });

        if (!created) {
            ratingInstance.rating = rating;
            ratingInstance.reviewContent = reviewContent || ratingInstance.reviewContent;
            ratingInstance.isApproved = true;
            await ratingInstance.save();
        }

        await ratingInstance.save({ transaction: t });
        if (req.userId) {
            await processUserActionForChallenges(
                req.userId,
                'movie_rated', // Hoặc 'content_rated' nếu có cả truyện
                { movieId, rating: ratingInstance.rating }, // Thêm rating nếu thử thách yêu cầu minRating
                t
            );
        }
        const pointResult = await awardPoints(userId, POINTS_FOR_RATING);
        if (pointResult && pointResult.user) {
            await checkAndAwardBadges(pointResult.user, { eventType: 'new_rating' });
        } else {
            await checkAndAwardBadges(userWhoRated, { eventType: 'new_rating' });
        }
        const finalRating = await Rating.findByPk(ratingInstance.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }]
        });

        const friendships = await Friend.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [{ userId: userId }, { friendId: userId }]
            },
            attributes: ['userId', 'friendId'],
            transaction: t
        });

        const friendIds = friendships
            .map(f => (f.userId === userId ? f.friendId : f.userId))
            .filter(id => id !== userId);

        if (friendIds.length > 0) {
            const notificationMessage = `<strong>${userWhoRated.name}</strong> vừa đánh giá ${rating} <i class="fas fa-star text-warning"></i> cho phim <a href="/album/${ratedMovie.slug}" class="notification-link-highlight">${ratedMovie.title}</a>.`;
            const notificationLink = `/album/${ratedMovie.slug}`;

            for (const friendId of friendIds) {
                await createAndEmitNotification({
                    recipientId: friendId,
                    senderId: userId,
                    type: 'FRIEND_ACTIVITY_RATED_MOVIE',
                    message: notificationMessage,
                    link: notificationLink,
                    iconUrl: userWhoRated.avatar,
                    transaction: t
                });
            }
        }
        await t.commit();
        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? 'Đánh giá đã được tạo.' : 'Đánh giá đã được cập nhật.',
            rating: finalRating
        });

    } catch (error) {
        await t.rollback();
        handleServerError(res, error, "Tạo/Cập nhật đánh giá");
    }
};

// Like/Unlike Review
export const likeUnlikeReview = async (req, res) => {
    const userId = req.userId;
    const { ratingId } = req.params;
    if (!userId) {
        console.error('[LikeReview] Error: Unauthorized - No userId');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const ratingInstance = await Rating.findByPk(ratingId);
        if (!ratingInstance) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        if (!ratingInstance.reviewContent) {
            return res.status(400).json({ success: false, message: 'Cannot like a rating without review content.' });
        }

        // Ép kiểu likes thành mảng
        let initialLikesArray = [];
        if (typeof ratingInstance.likes === 'string') {
            try {
                initialLikesArray = JSON.parse(ratingInstance.likes);
            } catch {
                initialLikesArray = [];
            }
        } else if (Array.isArray(ratingInstance.likes)) {
            initialLikesArray = ratingInstance.likes;
        } else {
            initialLikesArray = [];
        }
        const likesSet = new Set(initialLikesArray);
        let isLiked = false;

        if (likesSet.has(userId)) {
            likesSet.delete(userId);
            isLiked = false;
        } else {
            likesSet.add(userId);
            isLiked = true;
        }

        const updatedLikesArray = Array.from(likesSet);
        ratingInstance.likes = updatedLikesArray;
        await ratingInstance.save();

        res.status(200).json({
            success: true,
            message: isLiked ? 'Review liked.' : 'Review unliked.',
            likesCount: updatedLikesArray.length,
            isLiked: isLiked
        });

    } catch (error) {
        handleServerError(res, error, `Like/Unlike review ID ${ratingId}`);
    }
};

// Update Review
export const updateReview = async (req, res) => {
    const userId = req.userId;
    const { ratingId } = req.params;
    const { rating, reviewContent } = req.body; // Chỉ cho phép cập nhật rating và content

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    // Kiểm tra dữ liệu đầu vào
    if (rating !== undefined && (rating < 1 || rating > 10)) {
        return res.status(400).json({ success: false, message: 'Điểm rating phải từ 1 đến 10.' });
    }
    if (reviewContent !== undefined && typeof reviewContent !== 'string') {
        return res.status(400).json({ success: false, message: 'Nội dung review không hợp lệ.' });
    }

    try {
        const ratingInstance = await Rating.findByPk(ratingId);
        if (!ratingInstance) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        // --- KIỂM TRA QUYỀN SỞ HỮU ---
        if (ratingInstance.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa đánh giá này.' });
        }
        // --------------------------

        // Cập nhật các trường được phép
        if (rating !== undefined) {
            ratingInstance.rating = rating;
        }
        if (reviewContent !== undefined) {
            ratingInstance.reviewContent = reviewContent.trim() || null; // Lưu null nếu content rỗng sau khi trim
        }
        ratingInstance.isApproved = true; // Tự động duyệt lại khi user sửa

        await ratingInstance.save();

        // Lấy lại thông tin kèm user để trả về
        const updatedReview = await Rating.findByPk(ratingInstance.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }]
        });

        res.status(200).json({
            success: true,
            message: 'Đánh giá đã được cập nhật.',
            review: updatedReview
        });

    } catch (error) {
        handleServerError(res, error, `Cập nhật review ID ${ratingId}`);
    }
};

// Delete Review
export const deleteReview = async (req, res) => {
    const userId = req.userId;
    const { ratingId } = req.params;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const ratingInstance = await Rating.findByPk(ratingId);
        if (!ratingInstance) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        // --- KIỂM TRA QUYỀN SỞ HỮU ---
        if (ratingInstance.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa đánh giá này.' });
        }
        // --------------------------

        await ratingInstance.destroy();

        res.status(200).json({ success: true, message: 'Đánh giá đã được xóa.' }); // Hoặc 204 No Content

    } catch (error) {
        handleServerError(res, error, `Xóa review ID ${ratingId}`);
    }
};


async function createRating(req, res) {
    const { movieId, rating } = req.body;
    const userId = req.userId;

    try {
        const existingRating = await Rating.findOne({
            where: {
                movieId,
                userId
            }
        });

        if (existingRating) {
            await existingRating.destroy();
        }

        await Rating.create({
            movieId,
            userId,
            rating
        });

        return res.json({ message: 'Đánh giá thành công' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
}

async function getAverageRating(req, res) {
    const { slug } = req.params;

    try {
        const movie = await Movie.findOne({ where: { slug } });
        const ratings = await Rating.findAll({
            where: {
                movieId: movie.id
            }
        });

        const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
        const average = sum / ratings.length;

        return res.json({ averageRating: average });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi hệ thống: ' + error.message });
    }
}

export { createRating, getAverageRating };