import { _get, _post } from "../configs/api-methods.config";

export type TileEvaluation = "green" | "yellow" | "grey";

interface GameState {
  hasPlayed: boolean;
  guesses: string[];
  evaluations: TileEvaluation[][];
  won: boolean;
  streak: number;
  word?: string | null;
}

export interface GuessResult {
  isValid: boolean;
  evaluation?: TileEvaluation[];
  finished?: boolean;
  won?: boolean;
  attempts?: number;
  streak?: number;
  streakEnded?: boolean;
  word?: string | null;
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

export interface CircleBoardRow {
  userId: string;
  isMe: boolean;
  firstName: string;
  lastName?: string;
  profileImage: string | null;
  theme: string;
  currentStreak: number;
  longestStreak: number;
  playedToday: boolean;
  wonToday: boolean;
  attemptsToday: number | null;
}

class WordleService {
  static async getTodayGame(token: string): Promise<GameState> {
    return await _get<GameState>("wordle/today", token);
  }

  static async submitGuess(guess: string, token: string): Promise<GuessResult> {
    try {
      return await _post<GuessResult>("wordle/guess", { guess }, token);
    } catch (error: any) {
      if (error?.response?.data?.isValid === false) {
        return { isValid: false };
      }
      throw error;
    }
  }

  static async getCircleBoard(token: string): Promise<CircleBoardRow[]> {
    const response = await _get<{ success: boolean; board: CircleBoardRow[] }>("wordle/circle", token);
    return response.board;
  }

  static async checkStreak(token: string): Promise<StreakStatus> {
    return await _get<StreakStatus>("wordle/streak", token);
  }

  static async getStats(token: string): Promise<{ success: boolean; stats: UserStats }> {
    return await _get<{ success: boolean; stats: UserStats }>("wordle/stats", token);
  }
}

export default WordleService;
