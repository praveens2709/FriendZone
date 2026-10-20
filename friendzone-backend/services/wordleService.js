import fs from "fs";
import WordleGame from "../models/WordleGame.js";
import WordleStreak from "../models/WordleStreak.js";

const answers = JSON.parse(
  fs.readFileSync(new URL("../data/answers.json", import.meta.url))
);
const valid = JSON.parse(
  fs.readFileSync(new URL("../data/valid.json", import.meta.url))
);

const MAX_GUESSES = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const UTC_OFFSET_MINUTES = Number(process.env.WORDLE_UTC_OFFSET_MINUTES ?? 330);

export const ANSWER_WORDS = answers.map((w) => w.toUpperCase());
const VALID_WORD_SET = new Set([
  ...ANSWER_WORDS,
  ...valid.map((w) => w.toUpperCase()),
]);

const dateStringFor = (daysAgo = 0) =>
  new Date(Date.now() + UTC_OFFSET_MINUTES * 60 * 1000 - daysAgo * DAY_MS)
    .toISOString()
    .split("T")[0];

export const getTodayDateString = () => dateStringFor(0);
export const getYesterdayDateString = () => dateStringFor(1);

export const getTodayWord = () => {
  const dateString = getTodayDateString();

  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = (seed << 5) - seed + dateString.charCodeAt(i);
    seed = seed & seed;
  }

  return ANSWER_WORDS[Math.abs(seed) % ANSWER_WORDS.length];
};

export const isValidWord = (word) =>
  typeof word === "string" && VALID_WORD_SET.has(word.toUpperCase());

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

const getStreakCount = async (userId) => {
  const streak = await WordleStreak.findOne({ userId }).lean();
  return streak?.currentStreak || 0;
};

export const getTodayGame = async (userId) => {
  const todayDate = getTodayDateString();
  const game = await WordleGame.findOne({ userId, date: todayDate }).lean();
  const streak = await getStreakCount(userId);

  if (!game) {
    return { hasPlayed: false, guesses: [], evaluations: [], won: false, streak, word: null };
  }

  const finished = !game.inProgress;
  return {
    hasPlayed: finished,
    guesses: game.guesses,
    evaluations: game.guesses.map((g) => evaluateGuess(game.word, g)),
    won: finished ? game.won : false,
    streak,
    word: finished ? game.word : null,
  };
};

const recordResult = async (userId, won, todayDate) => {
  const yesterdayDate = getYesterdayDateString();

  let streakRecord = await WordleStreak.findOne({ userId });
  if (!streakRecord) {
    streakRecord = new WordleStreak({ userId });
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

  return { streak: streakRecord.currentStreak, streakEnded };
};

export const submitGuess = async (userId, rawGuess) => {
  if (typeof rawGuess !== "string" || !/^[A-Za-z]{5}$/.test(rawGuess)) {
    return { isValid: false };
  }

  const guess = rawGuess.toUpperCase();
  if (!isValidWord(guess)) {
    return { isValid: false };
  }

  const todayDate = getTodayDateString();
  const word = getTodayWord();

  const existing = await WordleGame.findOne({ userId, date: todayDate }).lean();
  if (existing && !existing.inProgress) {
    throw new Error("You have already played today");
  }

  if (!existing) {
    try {
      await WordleGame.create({ userId, date: todayDate, word, inProgress: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }

  const game = await WordleGame.findOneAndUpdate(
    {
      userId,
      date: todayDate,
      inProgress: true,
      [`guesses.${MAX_GUESSES - 1}`]: { $exists: false },
    },
    { $push: { guesses: guess } },
    { new: true }
  );

  if (!game) {
    throw new Error("You have already played today");
  }

  const evaluation = evaluateGuess(game.word, guess);
  const won = guess === game.word;
  const finished = won || game.guesses.length >= MAX_GUESSES;

  if (!finished) {
    return {
      isValid: true,
      evaluation,
      finished: false,
      won: false,
      attempts: game.guesses.length,
      streak: await getStreakCount(userId),
      streakEnded: false,
      word: null,
    };
  }

  const { streak, streakEnded } = await recordResult(userId, won, todayDate);

  await WordleGame.updateOne(
    { _id: game._id },
    {
      $set: {
        inProgress: false,
        won,
        attempts: game.guesses.length,
        streak,
        completedAt: new Date(),
      },
    }
  );

  return {
    isValid: true,
    evaluation,
    finished: true,
    won,
    attempts: game.guesses.length,
    streak,
    streakEnded,
    word: game.word,
  };
};

export const checkStreakStatus = async (userId) => {
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
};

export const getUserStats = async (userId) => {
  const streakRecord = await WordleStreak.findOne({ userId });
  if (!streakRecord) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalGamesPlayed: 0,
      totalGamesWon: 0,
      winPercentage: 0,
    };
  }

  return {
    currentStreak: streakRecord.currentStreak,
    longestStreak: streakRecord.longestStreak,
    totalGamesPlayed: streakRecord.totalGamesPlayed,
    totalGamesWon: streakRecord.totalGamesWon,
    winPercentage: streakRecord.winPercentage,
  };
};

export const getCircleBoard = async (userId, circleIds) => {
  const ids = [userId.toString(), ...circleIds];
  const today = getTodayDateString();

  const [streaks, games] = await Promise.all([
    WordleStreak.find({ userId: { $in: ids } }).lean(),
    WordleGame.find({ userId: { $in: ids }, date: today, inProgress: { $ne: true } }).lean(),
  ]);

  const streakByUser = new Map(streaks.map((s) => [s.userId.toString(), s]));
  const gameByUser = new Map(games.map((g) => [g.userId.toString(), g]));

  return ids
    .map((id) => {
      const streak = streakByUser.get(id);
      const game = gameByUser.get(id);
      return {
        userId: id,
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
        playedToday: !!game,
        wonToday: game ? game.won : false,
        attemptsToday: game ? game.attempts : null,
      };
    })
    .filter((row) => row.currentStreak > 0 || row.playedToday || row.userId === userId.toString())
    .sort(
      (a, b) =>
        b.currentStreak - a.currentStreak ||
        Number(b.wonToday) - Number(a.wonToday) ||
        (a.attemptsToday ?? 99) - (b.attemptsToday ?? 99)
    );
};
