// routes:
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

export default (wordleController) => { // wordleController is an object of functions
  const router = express.Router();

  router.get('/today', protect, wordleController.getTodayGame); // Line 7
  router.post('/submit', protect, wordleController.submitGame);
  router.get('/streak', protect, wordleController.checkStreak);
  router.get('/stats', protect, wordleController.getStats);
  router.post('/validate', protect, wordleController.validateWord);

  return router;
};