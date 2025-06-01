// backend/routes/challenge.routes.js
import express from 'express';
import * as challengeController from '../controllers/challenge.controller.js';
import authJwt from '../middlewares/authJwt.js';

const router = express.Router();

// User routes
router.get('/challenges', authJwt.verifyTokenOrGetUser, challengeController.getAvailableChallenges);
// router.get('/challenges/:id', authJwt.getUser, challengeController.getChallengeDetail); // TODO
router.post('/challenges/:challengeId/join', authJwt.verifyToken, challengeController.joinChallenge);
// router.post('/challenges/progress/:progressId/claim', authJwt.verifyToken, challengeController.claimChallengeReward); //TODO

// Admin routes
router.get('/admin/challenges/:id', authJwt.verifyToken, authJwt.isAdmin, challengeController.adminGetChallengeById);
router.put('/admin/challenges/:id', authJwt.verifyToken, authJwt.isAdmin, challengeController.adminUpdateChallenge);
router.delete('/admin/challenges/:id', authJwt.verifyToken, authJwt.isAdmin, challengeController.adminDeleteChallenge);

export default router;