import { Op, Sequelize } from "sequelize";
import { handleServerError } from "../utils/errorUtils.js";
import db from '../models/index.js';
import sequelize from "../config/database.js";

const Movie = db.Movie;
const User = db.User;
const Comic = db.Comic;
const Episode = db.Episode;
const Chapter = db.Chapter;
const Section = db.Section;
const Series = db.Series;
const Favorite = db.Favorite;
const FollowMovie = db.FollowMovie;
const Genre = db.Genre;
const Country = db.Country;
const Category = db.Category;
const Rating = db.Rating;
const Role = db.Role;
const ShopItem = db.ShopItem;
const UserInventory = db.UserInventory;
const Friend = db.Friend;

export const getDashboard = async (req, res) => {
    try {
        const [movies, genres, countries, categories, episodes, users] = await Promise.all([
            Movie.findAll(),
            Genre.findAll(),
            Country.findAll(),
            Category.findAll(),
            Episode.findAll(),
            User.findAll(),
        ]);
        res.status(200).json({ movies, genres, countries, categories, episodes, users });
    } catch (error) {
        handleServerError(res, error, "Lấy dữ liệu dashboard");
    }
};
// Constants
const COMMON_MOVIE_INCLUDES_FOR_CARD = [
    { model: Genre, as: 'genres', attributes: ['id', 'title', 'slug'], through: { attributes: [] }, required: false },
    { model: Country, as: 'countries', attributes: ['id', 'title', 'slug'], required: false },
    { model: Category, as: 'categories', attributes: ['id', 'title', 'slug'], required: false },
    {
        model: Episode,
        as: 'Episodes',
        attributes: ['id', 'episodeNumber'],
        order: [['episodeNumber', 'DESC']],
        limit: 1,
        required: false
    },
];

const COMMON_COMIC_INCLUDES_FOR_CARD = [
    { model: Genre, as: 'genres', attributes: ['id', 'title', 'slug'], through: { attributes: [] }, required: false },
    { model: Country, as: 'country', attributes: ['id', 'title', 'slug'], required: false },
    { model: Category, as: 'category', attributes: ['id', 'title', 'slug'], required: false },
    {
        model: Chapter,
        as: 'chapters',
        attributes: ['id', 'chapterNumber', 'title', 'order', 'createdAt'],
        order: [['order', 'DESC']],
        limit: 1,
        required: false
    },
];

// Default limits configuration
const DEFAULT_LIMITS = {
    hero: 5,
    sidebar: 10,
    latestMovies: 8,
    comics: 10,
    anime: 8,
};

// Category slugs
const CATEGORY_SLUGS = {
    ANIME: 'anime',
    SINGLE_MOVIE: 'phim-le',
    SERIES_MOVIE: 'phim-bo',
};

// Helper functions
const createDateOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
};

const parseLimit = (limit, defaultValue) => {
    const parsed = parseInt(limit, 10);
    return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
};

const extractLimits = (query) => ({
    hero: parseLimit(query.limitHero, DEFAULT_LIMITS.hero),
    sidebar: parseLimit(query.limitSidebar, DEFAULT_LIMITS.sidebar),
    latestMovies: parseLimit(query.limitLatestMovies, DEFAULT_LIMITS.latestMovies),
    comics: parseLimit(query.limitComics, DEFAULT_LIMITS.comics),
    anime: parseLimit(query.limitAnime, DEFAULT_LIMITS.anime),
});

// Smart featured content selection with scoring algorithm
const HERO_SCORING_WEIGHTS = {
    views: 0.4,        // 40% weight for popularity
    recency: 0.3,      // 30% weight for how recent
    rating: 0.2,       // 20% weight for quality
    completeness: 0.1, // 10% weight for content completeness
};

const HERO_FALLBACK_PERIODS = [7, 14, 30, 60]; // Days to look back

const calculateHeroScore = (movie) => {
    try {
        const now = new Date();
        const updatedAt = new Date(movie.updatedAt);
        const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
        
        // Normalize scores (0-1 scale) with safety checks
        const views = Number(movie.views) || 0;
        const viewsScore = Math.min(views / 100000, 1); // Cap at 100k views
        const recencyScore = Math.max(0, 1 - daysSinceUpdate / 30); // Linear decay over 30 days
        
        // Safe rating calculation
        let ratingScore = 0.5; // Default rating
        if (Array.isArray(movie.ratings) && movie.ratings.length > 0) {
            const totalRating = movie.ratings.reduce((sum, r) => {
                const rating = Number(r.rating) || 0;
                return sum + rating;
            }, 0);
            ratingScore = totalRating / (movie.ratings.length * 10);
        }
        
        // Completeness score based on available metadata with null safety
        let completenessScore = 0;
        if (Array.isArray(movie.genres) && movie.genres.length > 0) completenessScore += 0.25;
        if (Array.isArray(movie.countries) && movie.countries.length > 0) completenessScore += 0.25;
        if (Array.isArray(movie.categories) && movie.categories.length > 0) completenessScore += 0.25;
        if (movie.bannerURL && movie.bannerURL.trim()) completenessScore += 0.25;
        
        // Calculate weighted score
        const score = (
            viewsScore * HERO_SCORING_WEIGHTS.views +
            recencyScore * HERO_SCORING_WEIGHTS.recency +
            ratingScore * HERO_SCORING_WEIGHTS.rating +
            completenessScore * HERO_SCORING_WEIGHTS.completeness
        );
        
        return Math.round(score * 1000) / 1000; // Round to 3 decimal places
    } catch (error) {
        console.error('Error calculating hero score for movie:', movie.id, error);
        return 0; // Return minimum score on error
    }
};

const buildSmartHeroQuery = (daysBack, limit) => ({
    where: {
        status: 1,
        updatedAt: { [Op.gte]: createDateOffset(daysBack) },
        // Ensure minimum quality thresholds
        views: { [Op.gte]: 100 }, // At least 100 views
    },
    order: [['views', 'DESC'], ['updatedAt', 'DESC']],
    limit: limit * 3, // Fetch more candidates for scoring
    include: [
        ...COMMON_MOVIE_INCLUDES_FOR_CARD,
        { model: Rating, as: 'ratings', attributes: ['rating'], required: false }
    ],
    distinct: true,
});

const getSmartFeaturedForHero = async (targetLimit) => {
    let featuredMovies = [];
    let candidateCount = 0;
    
    try {
        // Try different time periods with fallback strategy
        for (const period of HERO_FALLBACK_PERIODS) {
            const candidates = await Movie.findAll(buildSmartHeroQuery(period, targetLimit));
            
            if (candidates.length === 0) continue;
            
            // Calculate scores for all candidates with error handling
            const scoredCandidates = candidates
                .map(movie => {
                    try {
                        const movieData = movie.toJSON ? movie.toJSON() : movie;
                        return {
                            ...movieData,
                            heroScore: calculateHeroScore(movieData)
                        };
                    } catch (error) {
                        console.error('Error processing movie candidate:', movie.id, error);
                        return null;
                    }
                })
                .filter(candidate => candidate !== null); // Remove failed candidates
            
            // Sort by score (descending) and take top candidates
            const topCandidates = scoredCandidates
                .sort((a, b) => b.heroScore - a.heroScore)
                .slice(0, targetLimit);
            
            // Check diversity (avoid too many from same genre/country)
            const diverseCandidates = ensureHeroDiversity(topCandidates, targetLimit);
            
            if (diverseCandidates.length >= targetLimit) {
                featuredMovies = diverseCandidates;
                candidateCount = candidates.length;
                console.log(`✅ Featured hero selection: Found ${featuredMovies.length} movies from ${period}-day period (${candidateCount} candidates evaluated)`);
                break;
            }
            
            // If not enough, continue to next period
            if (diverseCandidates.length > featuredMovies.length) {
                featuredMovies = diverseCandidates;
                candidateCount = candidates.length;
            }
        }
        
        // Final fallback - get any active movies if still not enough
        if (featuredMovies.length < targetLimit) {
            console.warn(`⚠️ Insufficient featured candidates (${featuredMovies.length}/${targetLimit}). Applying final fallback.`);
            
            const fallbackMovies = await Movie.findAll({
                where: { status: 1 },
                order: [['views', 'DESC'], ['createdAt', 'DESC']],
                limit: targetLimit,
                include: [
                    ...COMMON_MOVIE_INCLUDES_FOR_CARD,
                    { model: Rating, as: 'ratings', attributes: ['rating'], required: false }
                ],
                distinct: true,
            });
            
            featuredMovies = fallbackMovies
                .map(movie => {
                    try {
                        const movieData = movie.toJSON ? movie.toJSON() : movie;
                        return {
                            ...movieData,
                            heroScore: calculateHeroScore(movieData)
                        };
                    } catch (error) {
                        console.error('Error processing fallback movie:', movie.id, error);
                        return movieData; // Return without score if calculation fails
                    }
                })
                .filter(movie => movie !== null);
        }
        
        return featuredMovies;
    } catch (error) {
        console.error('Error in getSmartFeaturedForHero:', error);
        
        // Emergency fallback - return simple query result
        try {
            const emergencyMovies = await Movie.findAll({
                where: { status: 1 },
                order: [['views', 'DESC']],
                limit: targetLimit,
                include: COMMON_MOVIE_INCLUDES_FOR_CARD,
                distinct: true,
            });
            
            console.warn(`🚨 Emergency fallback activated. Returning ${emergencyMovies.length} movies.`);
            return emergencyMovies.map(movie => movie.toJSON ? movie.toJSON() : movie);
        } catch (emergencyError) {
            console.error('Emergency fallback failed:', emergencyError);
            return []; // Return empty array as last resort
        }
    }
};

const ensureHeroDiversity = (candidates, targetLimit) => {
    const selected = [];
    const genreCount = {};
    const countryCount = {};
    const maxPerGenre = Math.max(1, Math.floor(targetLimit * 0.6)); // Max 60% from same genre
    const maxPerCountry = Math.max(1, Math.floor(targetLimit * 0.7)); // Max 70% from same country
    
    for (const candidate of candidates) {
        if (selected.length >= targetLimit) break;
        
        // Safely extract arrays with proper null checks
        const movieGenres = Array.isArray(candidate.genres) ? candidate.genres : [];
        const movieCountries = Array.isArray(candidate.countries) ? candidate.countries : [];
        
        let genreConflict = false;
        let countryConflict = false;
        
        // Check if adding this movie would violate diversity rules
        for (const genre of movieGenres) {
            if (genre && genre.slug && (genreCount[genre.slug] || 0) >= maxPerGenre) {
                genreConflict = true;
                break;
            }
        }
        
        for (const country of movieCountries) {
            if (country && country.slug && (countryCount[country.slug] || 0) >= maxPerCountry) {
                countryConflict = true;
                break;
            }
        }
        
        // If no conflicts or we're still filling initial slots, add the candidate
        if (!genreConflict && !countryConflict) {
            selected.push(candidate);
            
            // Update counters with null safety
            movieGenres.forEach(genre => {
                if (genre && genre.slug) {
                    genreCount[genre.slug] = (genreCount[genre.slug] || 0) + 1;
                }
            });
            movieCountries.forEach(country => {
                if (country && country.slug) {
                    countryCount[country.slug] = (countryCount[country.slug] || 0) + 1;
                }
            });
        }
    }
    
    // If we still don't have enough after diversity filtering, 
    // add remaining candidates regardless of diversity
    if (selected.length < targetLimit) {
        const remaining = candidates.filter(c => !selected.find(s => s.id === c.id));
        selected.push(...remaining.slice(0, targetLimit - selected.length));
    }
    
    return selected;
};

const buildFeaturedForSidebarQuery = (limit) => ({
    where: {
        status: 1,
        updatedAt: { [Op.gte]: createDateOffset(7) }
    },
    order: [['views', 'DESC'], ['updatedAt', 'DESC']],
    limit,
    attributes: ['id', 'title', 'slug', 'bannerURL', 'belongToCategory', 'totalEpisodes'],
    include: [
        { model: Episode, as: 'Episodes', attributes: ['episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1, required: false },
    ],
    distinct: true,
    subQuery: false,
});

const buildLatestMoviesQuery = (limit) => ({
    where: { status: 1 },
    order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']],
    limit,
    include: COMMON_MOVIE_INCLUDES_FOR_CARD,
    distinct: true,
    subQuery: false,
});

const buildLatestComicsQuery = (limit) => ({
    order: [['lastChapterUpdatedAt', 'DESC']],
    include: COMMON_COMIC_INCLUDES_FOR_CARD,
    limit,
});

const buildPopularComicsQuery = (limit) => ({
    order: [['views', 'DESC'], ['lastChapterUpdatedAt', 'DESC']],
    limit,
    include: COMMON_COMIC_INCLUDES_FOR_CARD,
    distinct: true,
    subQuery: false,
});

// Data fetchers
const fetchFeaturedData = async (limits) => {
    const [featuredForHero, featuredForSidebar] = await Promise.all([
        getSmartFeaturedForHero(limits.hero),
        Movie.findAll(buildFeaturedForSidebarQuery(limits.sidebar))
    ]);

    return { featuredForHero, featuredForSidebar };
};

const fetchLatestContent = async (limits) => {
    const [latestMovies, latestComics, popularComics] = await Promise.all([
        Movie.findAll(buildLatestMoviesQuery(limits.latestMovies)),
        Comic.findAll(buildLatestComicsQuery(limits.comics)),
        Comic.findAll(buildPopularComicsQuery(limits.comics))
    ]);

    return { latestMovies, latestComics, popularComics };
};

// Main function
export const getHomePageLayoutData = async (req, res) => {
    try {
        // Extract and validate limits
        const limits = extractLimits(req.query);

        // Fetch all data in parallel groups for better performance
        const [featuredData, latestContent] = await Promise.all([
            fetchFeaturedData(limits),
            fetchLatestContent(limits),
        ]);

        // Combine all data
        const responseData = {
            ...featuredData,
            ...latestContent,
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error in getHomePageLayoutData:', error);
        handleServerError(res, error, "tải dữ liệu layout trang chủ");
    }
};
export const getPaginatedMovies = async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || ITEMS_PER_MAIN_LIST, 10);
        const offset = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = (req.query.sortOrder || 'DESC').toUpperCase();

        const orderOptions = [];
        if (sortBy === 'views') {
            orderOptions.push(['views', sortOrder]);
        } else {
            orderOptions.push(['createdAt', sortOrder]);
        }

        if (sortBy !== 'id') {
            orderOptions.push(['id', 'DESC']);
        }


        const { count, rows: movies } = await Movie.findAndCountAll({
            where: { status: 1 },
            include: COMMON_MOVIE_INCLUDES_FOR_CARD,
            order: orderOptions,
            limit: limit,
            offset: offset,
            distinct: true,
            subQuery: false,
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            success: true,
            movies,
            pagination: {
                totalItems: count,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
            },
        });
    } catch (error) {
        handleServerError(res, error, "tải danh sách phim phân trang");
    }
};

export const getGenre = async (req, res) => {
    try {
        const { slug } = req.params;
        const genre = await Genre.findOne({
            where: { slug },
            include: { model: Movie, include: { model: Episode } },
        });
        if (!genre) {
            return res.status(404).json({ success: false, message: 'Thể loại không tồn tại.' });
        }
        res.status(200).json({ success: true, genre });
    } catch (error) {
        handleServerError(res, error, `Lấy dữ liệu thể loại ${req.params.slug}`);
    }
}

export const getUserByUUID = async (req, res) => {
    try {
        const { uuid } = req.params;
        const viewingUserId = req.userId;
        const user = await User.findOne({
            where: { uuid, deletedAt: null },
            attributes: [
                'id', 'uuid', 'name', 'avatar', 'createdAt',
                'points', 'level', 'socialLinks', 'status', 'privacySettings'
            ],
            include: [
                {
                    model: Role,
                    as: 'roles',
                    attributes: ['name'],
                    through: { attributes: [] }
                },
                {
                    model: UserInventory,
                    as: 'inventory',
                    where: { isActive: true },
                    required: false,
                    attributes: ['id'],
                    include: [{
                        model: ShopItem,
                        as: 'itemDetails',
                        attributes: ['type', 'value'],
                        where: {
                            type: {
                                [Op.in]: ['AVATAR_FRAME', 'PROFILE_BACKGROUND', 'CHAT_COLOR']
                            }
                        },
                        required: true
                    }]
                }
            ]
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
        }

        const userData = user.toJSON();
        userData.activeAvatarFrame = null;
        userData.activeChatColor = null;
        userData.activeProfileBackground = null;

        if (userData.inventory && Array.isArray(userData.inventory)) {
            userData.inventory.forEach(invItem => {
                if (invItem.itemDetails) {
                    switch (invItem.itemDetails.type) {
                        case 'AVATAR_FRAME':
                            userData.activeAvatarFrame = invItem.itemDetails.value;
                            break;
                        case 'CHAT_COLOR':
                            userData.activeChatColor = invItem.itemDetails.value;
                            break;
                        case 'PROFILE_BACKGROUND':
                            userData.activeProfileBackground = invItem.itemDetails.value;
                            break;
                    }
                }
            });
        }
        delete userData.inventory;

        if (userData.roles) {
            userData.roles = userData.roles.map(r => r.name);
        }
        const privacy = userData.privacySettings || { showFriendsList: 'public', showTimeline: 'public' };
        let canViewFriends = false;
        let canViewTimeline = false;

        if (viewingUserId === userData.id) {
            canViewFriends = true;
            canViewTimeline = true;
        } else {
            let areFriends = false;
            if (viewingUserId) {
                const friendship = await Friend.findOne({
                    where: {
                        status: 'accepted',
                        [Op.or]: [
                            { userId: viewingUserId, friendId: userData.id },
                            { userId: userData.id, friendId: viewingUserId }
                        ]
                    }
                });
                areFriends = !!friendship;
            }

            if (privacy.showFriendsList === 'public') canViewFriends = true;
            else if (privacy.showFriendsList === 'friends' && areFriends) canViewFriends = true;

            if (privacy.showTimeline === 'public') canViewTimeline = true;
            else if (privacy.showTimeline === 'friends' && areFriends) canViewTimeline = true;
        }

        userData.canViewFriends = canViewFriends;
        userData.canViewTimeline = canViewTimeline;

        res.status(200).json({ success: true, user: userData });

    } catch (error) {
        handleServerError(res, error, `Lấy thông tin người dùng ${req.params.uuid}`);
    }
};

export const getTheatricalFilms = async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '30', 10);
        const offset = (page - 1) * limit;

        const { count, rows } = await Movie.findAndCountAll({
            where: { categoryId: 3 },
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset,
            include: [
                { model: Episode, attributes: ['episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 },
                { model: Genre, attributes: ['id', 'title', 'slug'], through: { attributes: [] } },
                { model: Country, as: 'countries', attributes: ['id', 'title'] },
                { model: Category, as: 'categories', attributes: ['id', 'title'] },
            ],
            distinct: true
        });

        const totalPages = Math.ceil(count / limit);
        res.status(200).json({
            success: true,
            movies: rows,
            pagination: { totalItems: count, totalPages, currentPage: page, itemsPerPage: limit }
        });
    } catch (error) {
        handleServerError(res, error, 'Lấy danh sách phim chiếu rạp');
    }
};

export const getNewlyUpdatedMovies = async (req, res) => {
    try {
        const movies = await Movie.findAll({
            order: [['createdAt', 'DESC']],
            include: [
                { model: Episode },
                { model: Section, as: 'sections' },
                { model: Genre, attributes: ['id', 'title'] },
            ],
        });
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching theatrical films' });
    }

}

export const getPlayMovie = async (req, res) => {
    const userId = req.userId;
    try {
        const { slug } = req.params;
        const { t } = req.query;

        const movie = await Movie.findOne({
            where: { slug },
            include: [
                ...COMMON_MOVIE_INCLUDES_FOR_CARD,
                {
                    model: Episode,
                    as: 'Episodes',
                    attributes: ['id', 'episodeNumber', 'linkEpisode', 'duration', 'views'],
                    order: [['episodeNumber', 'ASC']],
                },
                { model: Section, as: 'sections' },
                { model: Series, as: 'series', attributes: ['id', 'title'] },
            ],
        });

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Phim không tồn tại.' });
        }

        const requestedEpNum = parseInt(t, 10);
        let episode = movie.Episodes?.find((ep) => ep.episodeNumber === requestedEpNum);
        if (!episode) {
            episode = movie.Episodes?.[0]; // default to first episode
        }
        if (!episode) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tập phim.' });
        }

        Movie.increment('views', { where: { id: movie.id } }).catch((err) => console.error('Inc movie views', err));
        Episode.increment('views', { where: { id: episode.id } }).catch((err) => console.error('Inc episode views', err));

        const genreIds = movie.genres?.map((g) => g.id) || [];

        const similarMoviesPromise = Movie.findAll({
            where: {
                id: { [Op.ne]: movie.id },
                categoryId: movie.categoryId,
                ...(genreIds.length ? { '$genres.id$': { [Op.in]: genreIds } } : {}),
            },
            include: [
                { model: Genre, as: 'genres', attributes: [], through: { attributes: [] }, required: genreIds.length > 0 },
                { model: Episode, as: 'Episodes', attributes: ['episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 },
            ],
            order: [['views', 'DESC'], ['updatedAt', 'DESC']],
            limit: 10,
            distinct: true,
            subQuery: false,
        });

        const seriesMoviesPromise = movie.seriesId
            ? Movie.findAll({
                where: { seriesId: movie.seriesId, id: { [Op.ne]: movie.id } },
                include: [
                    { model: Episode, as: 'Episodes', attributes: ['episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 },
                ],
            })
            : Promise.resolve([]);

        const totalFavoritesPromise = Favorite.count({ where: { movieId: movie.id } });
        const totalFavoritesByEpisodePromise = Favorite.count({ where: { episodeId: episode.id } });

        const userFavoritePromise = userId
            ? Favorite.findOne({ where: { userId, episodeId: episode.id } })
            : Promise.resolve(null);

        const followStatusPromise = userId
            ? FollowMovie.findOne({ where: { userId, movieId: movie.id } })
            : Promise.resolve(null);

        const [
            similarMovies,
            seriesMovies,
            totalFavorites,
            totalFavoritesByEpisode,
            favoriteRecord,
            followRecord,
        ] = await Promise.all([
            similarMoviesPromise,
            seriesMoviesPromise,
            totalFavoritesPromise,
            totalFavoritesByEpisodePromise,
            userFavoritePromise,
            followStatusPromise,
        ]);

        res.status(200).json({
            success: true,
            movie,
            episode,
            similarMovies,
            seriesMovie: seriesMovies,
            totalFavorites,
            totalFavoritesByEpisode,
            isFavorite: !!favoriteRecord,
            isFollow: !!followRecord,
            genreMovies: similarMovies,
        });
    } catch (error) {
        handleServerError(res, error, `Lấy dữ liệu xem phim ${req.params.slug}`);
    }
};

export const getMovieDetail = async (req, res) => {
    const userId = req.userId;
    try {
        const { slug } = req.params;

        const movie = await Movie.findOne({
            where: { slug },
            include: [
                ...COMMON_MOVIE_INCLUDES_FOR_CARD,
                { model: Section, as: 'sections' },
                { model: Series, as: 'series', attributes: ['id', 'title'] },
            ],
        });

        if (!movie) {
            return res.status(404).json({ success: false, message: 'Phim không tồn tại.' });
        }

        const ratingAggregate = await Rating.findOne({
            where: { movieId: movie.id },
            attributes: [[Sequelize.fn('AVG', Sequelize.col('rating')), 'avgRating']],
            raw: true,
        });
        const averageRating = ratingAggregate?.avgRating ? parseFloat(ratingAggregate.avgRating).toFixed(1) : 0;

        const genreIds = movie.genres?.map(g => g.id) || [];

        const similarMoviesPromise = Movie.findAll({
            where: {
                id: { [Op.ne]: movie.id },
                categoryId: movie.categoryId,
                ...(genreIds.length ? { '$genres.id$': { [Op.in]: genreIds } } : {}),
            },
            include: [
                { model: Genre, as: 'genres', attributes: [], through: { attributes: [] }, required: genreIds.length > 0 },
                { model: Episode, as: 'Episodes', attributes: ['episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 },
            ],
            order: [['views', 'DESC'], ['updatedAt', 'DESC']],
            limit: 10,
            distinct: true,
            subQuery: false,
        });

        const seriesMoviesPromise = movie.seriesId
            ? Movie.findAll({
                where: { seriesId: movie.seriesId, id: { [Op.ne]: movie.id } },
                include: [
                    { model: Episode, as: 'Episodes', attributes: ['episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 },
                ],
            })
            : Promise.resolve([]);

        const totalFollowsPromise = FollowMovie.count({ where: { movieId: movie.id } });
        const followStatusPromise = userId
            ? FollowMovie.findOne({ where: { userId, movieId: movie.id } })
            : Promise.resolve(null);

        const [similarMovies, seriesMovies, totalFollows, followRecord] = await Promise.all([
            similarMoviesPromise,
            seriesMoviesPromise,
            totalFollowsPromise,
            followStatusPromise,
        ]);

        res.status(200).json({
            success: true,
            movie,
            averageRating: Number(averageRating),
            similarMovies,
            seriesMovie: seriesMovies,
            isFollowed: !!followRecord,
            totalFollows,
        });
    } catch (error) {
        handleServerError(res, error, `Lấy chi tiết phim ${req.params.slug}`);
    }
};

export const searchMovies = async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ message: 'Vui lòng nhập từ khóa để tìm kiếm!' });
    }

    try {
        const movies = await Movie.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.like]: `%${q}%` } },
                    { subTitle: { [Op.like]: `%${q}%` } }
                ]
            },
            include: { model: Episode, attributes: ['id', 'episodeNumber'] }
        });

        res.status(200).json(movies);
    } catch (error) {
        handleServerError(res, error, `Tìm kiếm phim với từ khóa "${q}"`);
    }
};

export const setFilter = async (req, res) => {
    try {
        const filters = req.body;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '30', 10);
        const offset = (page - 1) * limit;

        const options = {
            where: {},
            include: [
                { model: Genre, as: 'genres', attributes: ['id', 'title', 'slug'], through: { attributes: [] } },
                { model: Country, as: 'countries', attributes: ['id', 'title', 'slug'] },
                { model: Category, as: 'categories', attributes: ['id', 'title', 'slug'] },
                { model: Episode, attributes: ['id', 'episodeNumber'] }, // Chỉ lấy field cần thiết
                { model: Section, as: 'sections', attributes: ['id', 'title'] },
            ],
            distinct: true,
            limit: limit,
            offset: offset,
            order: [],
        };

        const whereClause = {};

        if (filters.region) {
            whereClause.countryId = filters.region;
        }

        if (filters.genre) {
            const genreInclude = options.include.find(inc => inc.model === Genre);
            if (genreInclude) {
                genreInclude.where = { id: filters.genre };
                genreInclude.required = true;
            }
        }

        // Lọc theo Năm (Year)
        if (filters.year) {
            const yearValue = filters.year;
            if (typeof yearValue === 'string' && yearValue.includes('-')) {
                const [startYear, endYear] = yearValue.split('-').map(Number);
                if (!isNaN(startYear) && !isNaN(endYear)) {
                    whereClause.year = { [Op.between]: [startYear, endYear] };
                }
            } else {
                const singleYear = parseInt(yearValue, 10);
                if (!isNaN(singleYear)) {
                    whereClause.year = singleYear;
                }
            }
        }

        // Lọc theo Mùa (Season) - Dùng hàm của DB
        if (filters.season) {
            const seasonMonths = {
                'Xuân': [3, 4, 5], 'Hạ': [6, 7, 8],
                'Thu': [9, 10, 11], 'Đông': [12, 1, 2]
            };
            const months = seasonMonths[filters.season];
            if (months) {
                whereClause[Op.and] = whereClause[Op.and] || [];
                whereClause[Op.and].push(
                    Sequelize.where(
                        Sequelize.fn('MONTH', Sequelize.col('releaseDate')),
                        { [Op.in]: months }
                    )
                );
            }
        }

        options.where = whereClause;

        if (filters.order) {
            if (filters.order === 'Hot') {
                options.order.push(['views', 'DESC']);
            } else if (filters.order === 'Mới nhất') {
                options.order.push(['createdAt', 'DESC']);
            }
        }
        if (options.order.length === 0) {
            options.order.push(['createdAt', 'DESC']);
        }

        const { count, rows } = await Movie.findAndCountAll(options);

        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            movies: rows,
            pagination: {
                totalItems: count,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        console.error('Error in setFilter:', error);
        res.status(500).json({ message: 'Lỗi khi lọc phim.', error: error.message });
    }
};

export const getFilters = async (req, res) => {
    try {
        const [genres, countries, categories] = await Promise.all([
            Genre.findAll({
                include: [
                    {
                        model: db.Movie,
                        through: { attributes: [] },
                        required: true, // Chỉ lấy genre có movie
                        attributes: [], // Không cần lấy thông tin movie
                    }
                ]
            }),
            Country.findAll(),
            Category.findAll()
        ]);

        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => 1990 + i);

        let filteredData = { genres, countries, categories, years };
        res.status(200).json(filteredData);

    } catch (error) {
        res.status(500).json({ error: 'Error fetching dashboard' });
    }
}

export const getPrevailingMovies = async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '12', 10);
        const offset = (page - 1) * limit;
        const categoryTitle = req.query.category;

        const whereClause = {};
        const includeOptions = [
            { model: Genre, as: 'genres', attributes: ['id', 'title', 'slug'], through: { attributes: [] } },
            { model: Country, as: 'countries', attributes: ['id', 'title', 'slug'] },
            { model: Category, as: 'categories', attributes: ['id', 'title', 'slug'] },
            { model: Episode, as: 'Episodes', attributes: ['episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 },
        ];

        if (categoryTitle) {
            const categorySlug = req.query.categorySlug;
            if (categorySlug) {
                const category = await Category.findOne({ where: { slug: categorySlug }, attributes: ['id'] });
                if (category) {
                    whereClause.categoryId = category.id;
                } else {
                    console.warn(`Category with slug "${categorySlug}" not found.`);
                }
            } else {
                const category = await Category.findOne({ where: { title: categoryTitle }, attributes: ['id'] });
                if (category) {
                    whereClause.categoryId = category.id;
                }
            }
            const categoryInclude = includeOptions.find(inc => inc.model === Category);
            if (categoryInclude) {
                categoryInclude.required = true;
            }
        }

        const { count, rows: prevailingMovies } = await Movie.findAndCountAll({
            where: whereClause,
            order: [
                ['views', 'DESC'],
                ['updatedAt', 'DESC'],
                ['createdAt', 'DESC']
            ],
            limit,
            offset,
            include: includeOptions,
            distinct: true,
            subQuery: false
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            success: true,
            movies: prevailingMovies,
            pagination: {
                totalItems: count,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
                currentFilter: categoryTitle || 'Tất cả'
            }
        });
    } catch (error) {
        handleServerError(res, error, 'Lấy phim thịnh hành');
    }
};

export const getAnime = async (req, res) => {
    try {
        const { page = 1, limit = 30 } = req.query;
        const offset = (page - 1) * limit;
        const { count, rows } = await Movie.findAndCountAll({
            where: { '$categories.title$': 'Anime' },
            order: [['views', 'DESC']],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            include: [
                { model: Genre, as: 'genres', attributes: ['id', 'title'], through: { attributes: [] } },
                { model: Country, as: 'countries' },
                { model: Category, as: 'categories', attributes: [], required: true },
                { model: Episode, attributes: ['episodeNumber'], order: [['episodeNumber', 'DESC']], limit: 1 },
            ],
            distinct: true,
            subQuery: false
        });

        const totalPages = Math.ceil(count / limit);
        res.status(200).json({
            success: true,
            movies: rows,
            pagination: { totalItems: count, totalPages, currentPage: parseInt(page, 10), itemsPerPage: parseInt(limit, 10) }
        });
    } catch (error) {
        handleServerError(res, error, 'Lấy danh sách phim Anime');
    }
};

export const searchMulti = async (req, res) => {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim() === "") {
        return res.status(400).json({ success: false, message: "Từ khóa tìm kiếm không được để trống." });
    }

    const searchTerm = q.trim();
    const searchLimit = parseInt(limit, 10);

    try {
        const movies = await Movie.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.like]: `%${searchTerm}%` } },
                    { subTitle: { [Op.like]: `%${searchTerm}%` } },
                ],
                status: 1,
            },
            limit: searchLimit,
            attributes: ['id', 'title', 'subTitle', 'slug', 'posterURL', 'year'],
            order: [
                ['views', 'DESC'],
                ['updatedAt', 'DESC']
            ]
        });

        const comics = await Comic.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.like]: `%${searchTerm}%` } }
                ],
            },
            limit: searchLimit,
            attributes: ['id', 'title', 'slug', 'coverImage', 'status', 'updatedAt'],
            order: [
                ['views', 'DESC'],
                ['updatedAt', 'DESC']
            ]
        });

        const combinedResults = [
            ...movies.map(movie => ({ ...movie.toJSON(), itemType: 'movie' })),
            ...comics.map(comic => ({ ...comic.toJSON(), itemType: 'comic' }))
        ];

        combinedResults.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

        const finalResults = combinedResults.slice(0, searchLimit);

        res.status(200).json({
            success: true,
            results: finalResults,
        });

    } catch (error) {
        console.error("SearchMulti Error:", error);
        handleServerError(res, error, "Lỗi khi tìm kiếm đa năng");
    }
};

export const getMovieReviews = async (req, res) => {
    const { movieId } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const sort = req.query.sort || 'newest';
    const offset = (page - 1) * limit;

    const orderOptions = [];
    switch (sort) {
        case 'rating_desc':
            orderOptions.push(['rating', 'DESC']);
            break;
        case 'rating_asc':
            orderOptions.push(['rating', 'ASC']);
            break;
        case 'likes_desc':
            orderOptions.push([sequelize.literal('JSON_LENGTH(likes)'), 'DESC']);
            break;
        case 'newest':
        default:
            orderOptions.push(['createdAt', 'DESC']);
            break;
    }
    if (!orderOptions.some(o => o[0] === 'createdAt')) {
        orderOptions.push(['createdAt', 'DESC']);
    }

    try {
        const { count, rows } = await Rating.findAndCountAll({
            where: {
                movieId: movieId,
                reviewContent: { [Op.ne]: null, [Op.ne]: '' },
                isApproved: true
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'avatar']
            }],
            order: orderOptions,
            limit: limit,
            offset: offset,
            distinct: true
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            success: true,
            reviews: rows,
            pagination: {
                totalItems: count,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit,
                currentSort: sort
            }
        });

    } catch (error) {
        handleServerError(res, error, `Lấy reviews cho phim ID ${movieId}`);
    }
};

export const getMyReviewForMovie = async (req, res) => {
    const userId = req.userId;
    const { movieId } = req.params;

    if (!movieId) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin movieId.' });
    }

    try {
        const rating = await Rating.findOne({
            where: {
                userId: userId,
                movieId: movieId
            },
        });

        if (rating) {
            let ratingObj = rating.toJSON ? rating.toJSON() : rating;
            if (ratingObj.likes && typeof ratingObj.likes === 'string') {
                try {
                    ratingObj.likes = JSON.parse(ratingObj.likes);
                } catch {
                    ratingObj.likes = [];
                }
            }
            if (!Array.isArray(ratingObj.likes)) {
                ratingObj.likes = [];
            }
            res.status(200).json({
                success: true,
                rating: ratingObj
            });
        } else {
            res.status(200).json({
                success: true,
                rating: null
            });
        }

    } catch (error) {
        handleServerError(res, error, `Lấy đánh giá của bạn cho phim ID ${movieId}`);
    }
};

export const getTopAnimeRankings = async (req, res) => {
    try {
        const animeCategory = await Category.findOne({ where: { slug: CATEGORY_SLUGS.ANIME } });
        
        if (!animeCategory) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy category Anime"
            });
        }

        const topAnime = await Movie.findAll({
            where: {
                categoryId: animeCategory.id,
                status: 1
            },
            include: [
                ...COMMON_MOVIE_INCLUDES_FOR_CARD,
                { model: Rating, as: 'ratings', attributes: ['rating'], required: false }
            ],
            order: [['views', 'DESC']],
            limit: 10,
            distinct: true,
            subQuery: false,
        });
        
        const processedTopAnime = topAnime.map((anime, index) => {
            const animeData = anime.toJSON ? anime.toJSON() : anime;
            
            let averageRating = 0;
            if (animeData.ratings && animeData.ratings.length > 0) {
                const sum = animeData.ratings.reduce((acc, rating) => acc + (rating.rating || 0), 0);
                averageRating = sum / animeData.ratings.length;
            }
            
            return {
                ...animeData,
                rank: index + 1,
                averageRating: parseFloat(averageRating.toFixed(1))
            };
        });

        res.status(200).json({
            success: true,
            rankings: processedTopAnime
        });
    } catch (error) {
        handleServerError(res, error, "Lấy danh sách xếp hạng top anime");
    }
};