import express from 'express';
import { getAlbumMovie, getAnime, getDashboard, getFilters, getGenre, getHomePageLayoutData, getNewlyUpdatedMovies, getPaginatedMovies, getPlayMovie, getPrevailingMovies, getTheatricalFilms, getUserByUUID, searchMulti, setFilter } from '../controllers/index.controller.js';
import authJwt from '../middlewares/authJwt.js';
import { addFavorite, deleteFavorite, getTotalFavorites } from '../controllers/favorite.controller.js';

const router = express.Router();

router.get('/page/home-layout', getHomePageLayoutData);
router.get('/movies/list', getPaginatedMovies);

router.get('/genre/:slug', getGenre);
router.get('/profile-user/:uuid', authJwt.verifyToken, getUserByUUID)

router.get('/newly-updated-movies', getNewlyUpdatedMovies);
router.get('/theatrical-films', getTheatricalFilms);

router.post('/filter', setFilter);
router.get('/filters', getFilters);
router.get('/prevailing', getPrevailingMovies);
router.get('/anime', getAnime);
router.get('/video-play/:slug', authJwt.verifyTokenOrGetUser, getPlayMovie);
router.get('/album-movie/:slug', authJwt.verifyTokenOrGetUser, getAlbumMovie);
router.get('/search/multi', searchMulti);
router.get('/dashboard', authJwt.verifyToken ,authJwt.isEditorOrAdmin, getDashboard);

router.post('/favorites', authJwt.verifyToken, addFavorite);
router.get('/episodes/:episodeId/favorites', getTotalFavorites);
router.delete('/favorites', authJwt.verifyToken, deleteFavorite);

export default router;
