// backend/models/UserChallengeProgress.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserChallengeProgress = sequelize.define('user_challenge_progresses', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
    },
    challengeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'challenges', key: 'id' },
        onDelete: 'CASCADE',
    },
    currentCount: { // Số lượng đã hoàn thành (ví dụ: xem 3/5 phim)
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    progressDetails: {
        // Lưu trữ các ID của item đã hoàn thành để tránh đếm trùng
        // Ví dụ: { completedMovieIds: [1,5], completedChapterIds: [10,12], lastCheckInDate: "2025-05-30" }
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
    },
    status: {
        type: DataTypes.ENUM('IN_PROGRESS', 'COMPLETED', 'REWARD_CLAIMED', 'FAILED'),
        defaultValue: 'IN_PROGRESS',
        allowNull: false
    },
    startedAt: { // Ngày user bắt đầu (hoặc được gán) thử thách
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    completedAt: { // Ngày user hoàn thành
        type: DataTypes.DATE,
        allowNull: true
    },
    rewardClaimedAt: { // Ngày user nhận thưởng (nếu có bước nhận riêng)
        type: DataTypes.DATE,
        allowNull: true
    },
    // lastProgressAt: { // Ngày tiến độ được cập nhật lần cuối
    //     type: DataTypes.DATE,
    //     defaultValue: DataTypes.NOW
    // }
}, {
    timestamps: true, // createdAt, updatedAt (updatedAt sẽ tự cập nhật khi save)
    // indexes: [ // Cho phép user tham gia lại thử thách repeatable sau một khoảng thời gian
    //     // Hoặc một user chỉ có một bản ghi IN_PROGRESS cho một challenge không repeatable
    //     { unique: true, fields: ['userId', 'challengeId', 'status'], where: { status: 'IN_PROGRESS', '$Challenge.isRepeatable$': false } }
    // ]
    // Việc quản lý repeatable sẽ phức tạp hơn, có thể cần logic check khi user join challenge
});

// UserChallengeProgress.beforeUpdate((instance) => {
//     instance.lastProgressAt = new Date();
// });

export default UserChallengeProgress;