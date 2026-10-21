import * as wordleService from '../services/wordleService.js';
import User from '../models/User.js';
import { getLockedInIds, emitToUsers } from '../services/privacyService.js';

const fail = (res, error, message) => {
  console.error(`Wordle error (${message}):`, error.message);
  res.status(500).json({ success: false, message });
};

export const getTodayGame = async (req, res) => {
  try {
    const gameData = await wordleService.getTodayGame(req.user.id);
    res.json({ success: true, ...gameData });
  } catch (error) {
    fail(res, error, 'Failed to get game data');
  }
};

export const submitGuess = async (req, res) => {
  try {
    const result = await wordleService.submitGuess(req.user.id, req.body?.guess);

    if (!result.isValid) {
      return res.status(400).json({ success: false, isValid: false, message: 'Not in word list' });
    }

    if (result.finished) {
      const circleIds = await getLockedInIds(req.user.id);
      emitToUsers(req.app.get('socketio'), [...circleIds, req.user.id.toString()], 'wordleChanged', {
        userId: req.user.id.toString(),
      });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message === 'You have already played today') {
      return res.status(400).json({ success: false, message: error.message });
    }
    fail(res, error, 'Failed to submit guess');
  }
};

export const checkStreak = async (req, res) => {
  try {
    const streakStatus = await wordleService.checkStreakStatus(req.user.id);
    res.json({ success: true, ...streakStatus });
  } catch (error) {
    fail(res, error, 'Failed to check streak');
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = await wordleService.getUserStats(req.user.id);
    res.json({ success: true, stats });
  } catch (error) {
    fail(res, error, 'Failed to get stats');
  }
};

export const validateWord = async (req, res) => {
  const { word } = req.body || {};

  if (!word || typeof word !== 'string' || word.length !== 5) {
    return res.status(400).json({
      success: false,
      message: 'Word must be a 5-letter string',
    });
  }

  res.json({ success: true, isValid: wordleService.isValidWord(word) });
};

export const getCircleBoard = async (req, res) => {
  try {
    const circleIds = await getLockedInIds(req.user.id);
    const rows = await wordleService.getCircleBoard(req.user.id, circleIds);
    const users = await User.find({ _id: { $in: rows.map((r) => r.userId) } })
      .select('firstName lastName profileImage')
      .lean();
    const byId = new Map(users.map((u) => [u._id.toString(), u]));

    res.json({
      success: true,
      board: rows
        .filter((r) => byId.has(r.userId))
        .map((r) => {
          const u = byId.get(r.userId);
          return {
            ...r,
            isMe: r.userId === req.user.id,
            firstName: u.firstName,
            lastName: u.lastName,
            profileImage: u.profileImage || null,
          };
        }),
    });
  } catch (error) {
    fail(res, error, 'Failed to load circle board');
  }
};
