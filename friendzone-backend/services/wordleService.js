import fs from "fs";
import WordleGame from "../models/WordleGame.js";
import WordleStreak from "../models/WordleStreak.js";

const answers = JSON.parse(
  fs.readFileSync(new URL("../data/answers.json", import.meta.url))
);
const valid = JSON.parse(
  fs.readFileSync(new URL("../data/valid.json", import.meta.url))
);

export const ANSWER_WORDS = answers.map((w) => w.toUpperCase());
export const VALID_FIVE_LETTER_WORDS = [
  ...new Set([...ANSWER_WORDS, ...valid.map((w) => w.toUpperCase())]),
];

console.log(`Loaded ${VALID_FIVE_LETTER_WORDS.length} valid 5-letter words`);
console.log(`Loaded ${ANSWER_WORDS.length} answer words`);

export const getTodayWord = () => {
  const today = new Date();
  const dateString = today.toISOString().split("T")[0];

  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = (seed << 5) - seed + dateString.charCodeAt(i);
    seed = seed & seed;
  }

  const pseudoRandom = Math.abs(seed) % ANSWER_WORDS.length;
  return ANSWER_WORDS[pseudoRandom];
};

export const getTodayDateString = () => {
  return new Date().toISOString().split("T")[0];
};

export const getYesterdayDateString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
};

export const isValidWord = (word) => {
  return VALID_FIVE_LETTER_WORDS.includes(word.toUpperCase());
};

export const evaluateGuess = (word, guess) => {
  word = word.toUpperCase();
  guess = guess.toUpperCase();

  const result = Array(5).fill("grey");
  const wordLetters = word.split("");

  for (let i = 0; i < 5; i++) {
    if (guess[i] === word[i]) {
      result[i] = "green";
      wordLetters[i] = null;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === "grey") {
      const index = wordLetters.indexOf(guess[i]);
      if (index !== -1) {
        result[i] = "yellow";
        wordLetters[index] = null;
      }
    }
  }

  return result;
};

export const checkIfPlayedToday = async (userId) => {
  try {
    const todayDate = getTodayDateString();
    const game = await WordleGame.findOne({ userId, date: todayDate });
    return !!game;
  } catch (error) {
    console.error("Error in checkIfPlayedToday:", error);
    throw error;
  }
};

export const getTodayGame = async (userId) => {
  try {
    const todayDate = getTodayDateString();
    const game = await WordleGame.findOne({ userId, date: todayDate });
    const streak = await WordleStreak.findOne({ userId });

    return {
      hasPlayed: !!game,
      game: game || null,
      streak: streak?.currentStreak || 0,
      word: game ? null : getTodayWord(),
    };
  } catch (error) {
    console.error("Error in getTodayGame:", error);
    throw error;
  }
};

export const submitGameResult = async (userId, guesses, won) => {
  try {
    const todayDate = getTodayDateString();
    const yesterdayDate = getYesterdayDateString();
    const word = getTodayWord();

    for (const guess of guesses) {
      if (!isValidWord(guess)) throw new Error(`Invalid word: ${guess}`);
    }

    const existingGame = await WordleGame.findOne({ userId, date: todayDate });
    if (existingGame) throw new Error("You have already played today");

    let streakRecord = await WordleStreak.findOne({ userId });
    if (!streakRecord) {
      streakRecord = new WordleStreak({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedDate: null,
        totalGamesPlayed: 0,
        totalGamesWon: 0,
        winPercentage: 0,
      });
    }

    let streakEnded = false;
    const lastPlayedDate = streakRecord.lastPlayedDate;

    if (won) {
      if (lastPlayedDate === yesterdayDate) {
        streakRecord.currentStreak += 1;
      } else if (!lastPlayedDate || lastPlayedDate < yesterdayDate) {
        streakEnded = streakRecord.currentStreak > 0;
        streakRecord.currentStreak = 1;
      }
      if (streakRecord.currentStreak > streakRecord.longestStreak) {
        streakRecord.longestStreak = streakRecord.currentStreak;
      }
      streakRecord.totalGamesWon += 1;
    } else {
      if (streakRecord.currentStreak > 0) streakEnded = true;
      streakRecord.currentStreak = 0;
    }

    streakRecord.lastPlayedDate = todayDate;
    streakRecord.totalGamesPlayed += 1;
    streakRecord.winPercentage = Math.round(
      (streakRecord.totalGamesWon / streakRecord.totalGamesPlayed) * 100
    );

    await streakRecord.save();

    const game = new WordleGame({
      userId,
      date: todayDate,
      word,
      guesses,
      won,
      attempts: guesses.length,
      streak: streakRecord.currentStreak,
      completedAt: new Date(),
    });
    await game.save();

    return {
      success: true,
      won,
      streak: streakRecord.currentStreak,
      streakEnded,
      attempts: guesses.length,
      word: won ? null : word,
    };
  } catch (error) {
    console.error("Error in submitGameResult:", error);
    throw error;
  }
};

export const checkStreakStatus = async (userId) => {
  try {
    const yesterdayDate = getYesterdayDateString();
    const streakRecord = await WordleStreak.findOne({ userId });

    if (!streakRecord || !streakRecord.lastPlayedDate) {
      return { hasStreak: false, streakEnded: false, currentStreak: 0 };
    }

    if (
      streakRecord.lastPlayedDate < yesterdayDate &&
      streakRecord.currentStreak > 0
    ) {
      streakRecord.currentStreak = 0;
      await streakRecord.save();
      return { hasStreak: false, streakEnded: true, currentStreak: 0 };
    }

    return {
      hasStreak: streakRecord.currentStreak > 0,
      streakEnded: false,
      currentStreak: streakRecord.currentStreak,
    };
  } catch (error) {
    console.error("Error in checkStreakStatus:", error);
    throw error;
  }
};

export const getUserStats = async (userId) => {
  try {
    const streakRecord = await WordleStreak.findOne({ userId });
    if (!streakRecord)
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalGamesPlayed: 0,
        totalGamesWon: 0,
        winPercentage: 0,
      };

    return {
      currentStreak: streakRecord.currentStreak,
      longestStreak: streakRecord.longestStreak,
      totalGamesPlayed: streakRecord.totalGamesPlayed,
      totalGamesWon: streakRecord.totalGamesWon,
      winPercentage: streakRecord.winPercentage,
    };
  } catch (error) {
    console.error("Error in getUserStats:", error);
    throw error;
  }
};
