// backend/controllers/watchHistory.controller.js
import * as watchHistoryService from '../services/watchHistory.service.js';
import { handleServerError } from "../utils/errorUtils.js";

export const addWatchHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const { episodeId, watchedDuration } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập." });
        }
        if (episodeId === undefined || watchedDuration === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu episodeId hoặc watchedDuration." });
        }

        const updatedWatchHistory = await watchHistoryService.processAddOrUpdateWatchHistory(userId, parseInt(episodeId), parseFloat(watchedDuration));
        res.status(200).json({ success: true, watchHistory: updatedWatchHistory });
    } catch (error) {
        console.error("Add Watch History Error in Controller:", error);
        const statusCode = error.statusCode || 500;
        handleServerError(res, error, "Lỗi khi thêm lịch sử xem", statusCode);
    }
};

export const getAllWatchHistories = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)){
             return res.status(400).json({ success: false, message: "UserID không hợp lệ." });
        }

        const histories = await watchHistoryService.fetchAllUserWatchHistories(userId);
        res.status(200).json(histories);
    } catch (error) {
        console.error("Get All Watch Histories Error:", error);
        const statusCode = error.statusCode || 500;
        handleServerError(res, error, "Lỗi khi lấy lịch sử xem", statusCode);
    }
};

export const deleteWatchHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const { episodeId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập." });
        }

        await watchHistoryService.removeWatchHistory(userId, episodeId);
        res.status(204).send();
    } catch (error) {
        console.error("Delete Watch History Error:", error);
        const statusCode = error.statusCode || 500;
        handleServerError(res, error, "Lỗi khi xóa lịch sử xem", statusCode);
    }
};

export const pingWatchDuration = async (req, res) => {
    try {
        const userId = req.userId;
        const { episodeId, incrementSeconds } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập." });
        }
        if (episodeId === undefined || incrementSeconds === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu episodeId hoặc incrementSeconds." });
        }
        if (isNaN(parseInt(episodeId)) || isNaN(parseInt(incrementSeconds)) || parseInt(incrementSeconds) <= 0) {
             return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ." });
        }

        await watchHistoryService.processIncrementWatchDuration(userId, parseInt(episodeId), parseInt(incrementSeconds));
        res.status(204).send();
    } catch (error) {
        console.error("Ping Watch Duration Error in Controller:", error);
        const statusCode = error.statusCode || 500;
        handleServerError(res, error, "Lỗi khi cập nhật thời gian xem (ping)", statusCode);
    }
};