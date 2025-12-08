import * as wordleService from '../services/wordleService.js';

export const getTodayGame = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Controller: getTodayGame called for userId:', userId);
    
    const gameData = await wordleService.getTodayGame(userId);
    
    console.log('Controller: getTodayGame successfully returned data.');
    
    res.json({
      success: true,
      hasPlayed: gameData.hasPlayed,
      guesses: gameData.game?.guesses || [],
      won: gameData.game?.won || false,
      streak: gameData.streak,
      word: gameData.word
    });
  } catch (error) {
    console.error('Controller ERROR: Error in getTodayGame:', error.message);
    console.error('Controller STACK:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get game data',
      error: error.message
    });
  }
};

export const submitGame = async (req, res) => {
  try {
    const userId = req.user.id;
    const { guesses, won } = req.body;

    console.log('Controller: submitGame called for userId:', userId, 'won:', won);

    // Validation
    if (!Array.isArray(guesses) || guesses.length === 0 || guesses.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid guesses'
      });
    }

    if (typeof won !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Invalid win status'
      });
    }

    const result = await wordleService.submitGameResult(userId, guesses, won);

    console.log('Controller: submitGame successfully returned result.');

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Controller ERROR: Error in submitGame controller:', error.message);
    console.error('Controller STACK:', error.stack);
    
    if (error.message === 'You have already played today') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.startsWith('Invalid word:')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit game',
      error: error.message
    });
  }
};

export const checkStreak = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Controller: checkStreak called for userId:', userId);
    
    const streakStatus = await wordleService.checkStreakStatus(userId);

    console.log('Controller: checkStreak successfully returned status.');

    res.json({
      success: true,
      ...streakStatus
    });
  } catch (error) {
    console.error('Controller ERROR: Error in checkStreak controller:', error.message);
    console.error('Controller STACK:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to check streak',
      error: error.message
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Controller: getStats called for userId:', userId);
    
    const stats = await wordleService.getUserStats(userId);

    console.log('Controller: getStats successfully returned stats.');

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Controller ERROR: Error in getStats controller:', error.message);
    console.error('Controller STACK:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
};

export const validateWord = async (req, res) => {
  try {
    const { word } = req.body;

    console.log('Controller: validateWord called for word:', word);

    if (!word || typeof word !== 'string' || word.length !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Word must be a 5-letter string'
      });
    }

    const isValid = wordleService.isValidWord(word);

    console.log('Controller: validateWord result:', isValid);

    res.json({
      success: true,
      isValid
    });
  } catch (error) {
    console.error('Controller ERROR: Error in validateWord controller:', error.message);
    console.error('Controller STACK:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to validate word',
      error: error.message
    });
  }
};