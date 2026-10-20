import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';

const guessLimiter = rateLimit({
  name: 'wordle-guess',
  windowMs: 10 * 60 * 1000,
  max: 60,
  keyFn: (req) => req.user?.id || req.ip,
});

export default (wordleController) => {
  const router = express.Router();

  router.get('/today', protect, wordleController.getTodayGame);
  router.post('/guess', protect, guessLimiter, wordleController.submitGuess);
  router.get('/streak', protect, wordleController.checkStreak);
  router.get('/circle', protect, wordleController.getCircleBoard);
  router.get('/stats', protect, wordleController.getStats);
  router.post('/validate', protect, wordleController.validateWord);

  return router;
};
