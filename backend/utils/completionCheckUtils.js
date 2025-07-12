// backend/utils/completionCheckUtils.js
import db from "../models/index.js";
import { parseDurationToMilliseconds } from './timeUtils.js';

const WatchHistory = db.WatchHistory;
const Episode = db.Episode;
const Movie = db.Movie;
const Series = db.Series;

/**
 * Checks if a user has completed watching a specific episode.
 * An episode is considered completed if watched duration >= 90% of total duration.
 * @param {number} userId
 * @param {number} episodeId
 * @param {object} [transaction] - Optional Sequelize transaction.
 * @returns {Promise<boolean>} True if completed, false otherwise.
 */
export const checkEpisodeCompletion = async (userId, episodeId, transaction = null) => {
    const episode = await Episode.findByPk(episodeId, {
        attributes: ['id', 'duration'],
        transaction
    });

    if (!episode || !episode.duration) {
        console.warn(`[CompletionCheck] Episode ${episodeId} not found or has no duration.`);
        return false;
    }

    const totalEpisodeDurationMs = parseDurationToMilliseconds(episode.duration);
    if (totalEpisodeDurationMs === null || totalEpisodeDurationMs === 0) {
        console.warn(`[CompletionCheck] Invalid or zero duration for episode ${episodeId}.`);
        return false;
    }

    const watchHistory = await WatchHistory.findOne({
        where: { userId, episodeId },
        attributes: ['watchedDuration'],
        transaction
    });

    if (!watchHistory || !watchHistory.watchedDuration) {
        return false;
    }

    const watchedDurationMs = watchHistory.watchedDuration * 1000;
    const completionThreshold = 0.9;

    return watchedDurationMs >= totalEpisodeDurationMs * completionThreshold;
};

/**
 * Checks if a user has completed watching a specific movie.
 * - For single-part movies: based on watched duration of the movie itself.
 * - For multi-episode movies: if all episodes are completed.
 * @param {number} userId
 * @param {number} movieId
 * @param {object} [transaction] - Optional Sequelize transaction.
 * @returns {Promise<boolean>} True if completed, false otherwise.
 */
export const checkMovieCompletion = async (userId, movieId, transaction = null) => {
    const movie = await Movie.findByPk(movieId, {
        attributes: ['id', 'type', 'totalEpisodes', 'duration'], // Thêm movie.type để phân biệt
        include: [{
            model: Episode,
            as: 'Episodes', // Hoặc alias đúng của bạn cho Movie.hasMany(Episode)
            attributes: ['id', 'duration'], // Cần duration của từng tập nếu là phim bộ
            required: false // LEFT JOIN
        }],
        transaction
    });

    if (!movie) {
        console.warn(`[CompletionCheck] Movie ${movieId} not found.`);
        return false;
    }

    // Kịch bản 1: Phim lẻ (không có nhiều tập hoặc type là phim lẻ)
    // Giả sử 'single_film' là một giá trị trong movie.type
    // hoặc không có `totalEpisodes` hoặc `totalEpisodes` <= 1
    const isSingleFilm = movie.type === 'single_film' || !movie.totalEpisodes || parseInt(movie.totalEpisodes) <= 1;

    if (isSingleFilm) {
        if (!movie.duration) { // Phim lẻ phải có duration tổng
            console.warn(`[CompletionCheck] Single film ${movieId} has no duration.`);
            return false;
        }
        const totalMovieDurationMs = parseDurationToMilliseconds(movie.duration);
        if (!totalMovieDurationMs || totalMovieDurationMs === 0) {
            console.warn(`[CompletionCheck] Invalid or zero duration for single film ${movieId}.`);
            return false;
        }

        // Đối với phim lẻ, WatchHistory có thể lưu trực tiếp movieId thay vì episodeId,
        // hoặc có một episode ảo đại diện cho phim lẻ đó.
        // Giả sử có một Episode ảo có id trùng với movieId hoặc có một cách liên kết.
        // Nếu WatchHistory lưu theo episodeId, và phim lẻ chỉ có 1 episode:
        const singleEpisode = movie.Episodes && movie.Episodes.length > 0 ? movie.Episodes[0] : null;
        if (!singleEpisode) {
             // Hoặc bạn có thể query WatchHistory với điều kiện đặc biệt cho phim lẻ
            console.warn(`[CompletionCheck] No episode found for single film ${movieId} to check history.`);
            return false;
        }
        return await checkEpisodeCompletion(userId, singleEpisode.id, transaction);

    } else {
        // Kịch bản 2: Phim bộ (có nhiều tập)
        const episodes = movie.Episodes;
        if (!episodes || episodes.length === 0) {
            // console.warn(`[CompletionCheck] Movie ${movieId} is a series but has no episodes listed.`);
            return false; // Phim bộ không có tập thì không thể hoàn thành
        }

        // Kiểm tra xem tất cả các tập đã được hoàn thành chưa
        for (const episode of episodes) {
            const isEpisodeDone = await checkEpisodeCompletion(userId, episode.id, transaction);
            if (!isEpisodeDone) {
                return false; // Nếu một tập chưa xong, thì cả phim chưa xong
            }
        }
        return true; // Tất cả các tập đã hoàn thành
    }
};

/**
 * Checks if a user has completed watching all movies in a specific series.
 * @param {number} userId
 * @param {number} seriesId
 * @param {object} [transaction] - Optional Sequelize transaction.
 * @returns {Promise<boolean>} True if completed, false otherwise.
 */
export const checkSeriesCompletion = async (userId, seriesId, transaction = null) => {
    const series = await Series.findByPk(seriesId, {
        include: [{
            model: Movie,
            as: 'movies', // Alias của Series.hasMany(Movie)
            attributes: ['id'], // Chỉ cần ID của các phim trong series
            required: true // Series phải có phim
        }],
        transaction
    });

    if (!series || !series.movies || series.movies.length === 0) {
        // console.warn(`[CompletionCheck] Series ${seriesId} not found or has no movies.`);
        return false; // Series không tồn tại hoặc không có phim nào
    }

    for (const movie of series.movies) {
        const isMovieDone = await checkMovieCompletion(userId, movie.id, transaction);
        if (!isMovieDone) {
            return false; // Nếu một phim trong series chưa xong, thì cả series chưa xong
        }
    }

    return true; // Tất cả các phim trong series đã hoàn thành
};