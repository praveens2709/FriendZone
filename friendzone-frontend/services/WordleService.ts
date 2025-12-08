import { _get, _post } from "../configs/api-methods.config";

interface GameState {
  hasPlayed: boolean;
  guesses: string[];
  won: boolean;
  streak: number;
  word?: string;
}

interface SubmitGameData {
  guesses: string[];
  won: boolean;
  word: string;
}

interface GameResult {
  success: boolean;
  won: boolean;
  streak: number;
  streakEnded: boolean;
  attempts: number;
  word?: string;
}

interface StreakStatus {
  hasStreak: boolean;
  streakEnded: boolean;
  currentStreak: number;
}

interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalGamesPlayed: number;
  totalGamesWon: number;
  winPercentage: number;
}

interface ValidateWordResponse {
  success: boolean;
  isValid: boolean;
}

class WordleService {
  static async getTodayGame(token: string): Promise<GameState> {
    try {
      const response = await _get<GameState>("wordle/today", token);
      return response;
    } catch (error) {
      console.error('Error getting today\'s game:', error);
      throw error;
    }
  }

  static async submitGame(data: SubmitGameData, token: string): Promise<GameResult> {
    try {
      const response = await _post<GameResult>(
        "wordle/submit",
        { guesses: data.guesses, won: data.won },
        token
      );
      return response;
    } catch (error) {
      console.error('Error submitting game:', error);
      throw error;
    }
  }

  static async checkStreak(token: string): Promise<StreakStatus> {
    try {
      const response = await _get<StreakStatus>("wordle/streak", token);
      return response;
    } catch (error) {
      console.error('Error checking streak:', error);
      throw error;
    }
  }

  static async getStats(token: string): Promise<{ success: boolean; stats: UserStats }> {
    try {
      const response = await _get<{ success: boolean; stats: UserStats }>("wordle/stats", token);
      return response;
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  static async validateWord(word: string, token: string): Promise<boolean> {
    try {
      const response = await _post<ValidateWordResponse>(
        "wordle/validate",
        { word },
        token
      );
      return response.isValid;
    } catch (error) {
      console.error('Error validating word:', error);
      return false;
    }
  }
}

export default WordleService;