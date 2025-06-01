// backend/models/Challenge.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js'; // Đảm bảo đường dẫn đúng

const Challenge = sequelize.define('challenges', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Tên thử thách nên là duy nhất
    },
    slug: { // Để tạo URL đẹp cho trang chi tiết thử thách
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        // WATCH_X_MOVIES: Xem X phim bất kỳ. criteria: {}
        // WATCH_X_EPISODES: Xem X tập phim bất kỳ. criteria: {}
        // WATCH_GENRE_MOVIES: Xem X phim thuộc thể loại nhất định. criteria: { genreIds: [1,2], countPerGenre?: 1 }
        // WATCH_CATEGORY_MOVIES: Xem X phim thuộc danh mục nhất định. criteria: { categoryIds: [1,2] }
        // COMPLETE_MOVIE: Xem hết các tập của một phim cụ thể. criteria: { movieId: 1 }
        // COMPLETE_SERIES: Xem hết các phim trong một series. criteria: { seriesId: 1 }
        // RATE_X_MOVIES: Đánh giá X phim. criteria: { minRating?: 4 }
        // READ_X_COMICS: Đọc X truyện bất kỳ. criteria: {}
        // READ_X_CHAPTERS: Đọc X chương truyện bất kỳ. criteria: {}
        // READ_GENRE_COMICS: Đọc X truyện thuộc thể loại. criteria: { genreIds: [3,4] }
        // COMPLETE_COMIC: Đọc hết các chương của một truyện. criteria: { comicId: 1 }
        // DAILY_LOGIN_STREAK: Đăng nhập liên tục X ngày. criteria: {} (targetCount là số ngày)
        // ADD_X_FRIENDS: Kết bạn với X người. criteria: {}
        // CREATE_X_COLLECTIONS: Tạo X bộ sưu tập. criteria: {}
        type: DataTypes.STRING,
        allowNull: false,
    },
    targetCount: { // Số lượng mục tiêu (ví dụ: 5 phim, 20 chương, 7 ngày)
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    criteria: {
        // Ví dụ:
        // { genreIds: [1,2], minRating: 4 } cho WATCH_GENRE_MOVIES
        // { authorName: "Tác Giả X" } cho READ_AUTHOR_COMICS
        // { specificMovieIds: [10, 12, 15] } cho WATCH_SPECIFIC_MOVIES
        // { periodDays: 7 } cho thử thách "Xem X phim trong 7 ngày" (kết hợp với startedAt của UserChallengeProgress)
        type: DataTypes.JSON,
        allowNull: true,
    },
    pointsReward: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    badgeIdReward: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'badges', key: 'id' },
        onDelete: 'SET NULL', // Giữ lại challenge nếu badge bị xóa
    },
    shopItemIdReward: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'shop_items', key: 'id' },
        onDelete: 'SET NULL',
    },
    startDate: { // Ngày thử thách bắt đầu có hiệu lực (cho tất cả user)
        type: DataTypes.DATE,
        allowNull: true
    },
    endDate: { // Ngày thử thách kết thúc (cho tất cả user)
        type: DataTypes.DATE,
        allowNull: true
    },
    durationForUserDays: { // Thời hạn cho người dùng hoàn thành KỂ TỪ KHI HỌ BẮT ĐẦU (nếu có)
        type: DataTypes.INTEGER, // Ví dụ: 7 (ngày)
        allowNull: true
    },
    isActive: { // Admin có thể bật/tắt thử thách
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    isRepeatable: { // Người dùng có thể làm lại thử thách không? (ví dụ: hàng tuần)
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    repeatIntervalDays: { // Nếu isRepeatable, khoảng thời gian lặp lại (ví dụ: 7 cho hàng tuần)
        type: DataTypes.INTEGER,
        allowNull: true
    },
    requiredLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    coverImageUrl: { // Ảnh bìa cho thử thách (hiển thị trên trang danh sách thử thách)
        type: DataTypes.STRING,
        allowNull: true
    },
}, {
    timestamps: true,
    hooks: {
        async beforeValidate(challenge) { // Tự động tạo slug
            if (challenge.title && (!challenge.slug || challenge.changed('title'))) {
                const { generateSlug } = await import('../utils/slugUtils.js'); // Dynamic import
                let baseSlug = generateSlug(challenge.title);
                let uniqueSlug = baseSlug;
                let counter = 1;
                while (await Challenge.findOne({ where: { slug: uniqueSlug, id: { [DataTypes.Op.ne]: challenge.id || null } } })) {
                    uniqueSlug = `${baseSlug}-${counter}`;
                    counter++;
                }
                challenge.slug = uniqueSlug;
            }
        }
    }
});

export default Challenge;