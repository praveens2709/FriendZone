import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Animated } from "react-native";
import ThemedModal from "@/components/ThemedModal";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import HowToPlayModal from "./HowToPlayModal";
import ResultModal from "./ResultModal";
import WordleService, { TileEvaluation } from "@/services/WordleService";
import { useAuth } from "@/context/AuthContext";

type KeyStatus = 'correct' | 'present' | 'absent' | 'unused';

const EVALUATION_TO_KEY: Record<TileEvaluation, KeyStatus> = {
  green: 'correct',
  yellow: 'present',
  grey: 'absent',
};

const KEY_RANK: Record<KeyStatus, number> = {
  unused: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

const FlipTile = ({
  evaluation,
  delay,
  renderFace,
}: {
  evaluation?: TileEvaluation;
  delay: number;
  renderFace: (shown: TileEvaluation | null) => React.ReactNode;
}) => {
  const flip = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<TileEvaluation | null>(evaluation ?? null);
  const previous = useRef<TileEvaluation | undefined>(evaluation);

  useEffect(() => {
    const before = previous.current;
    previous.current = evaluation;
    if (evaluation && !before) {
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(flip, { toValue: 1, duration: 170, useNativeDriver: true }),
      ]).start(() => {
        setShown(evaluation);
        Animated.timing(flip, { toValue: 0, duration: 170, useNativeDriver: true }).start();
      });
    } else {
      setShown(evaluation ?? null);
    }
  }, [evaluation, delay, flip]);

  return (
    <Animated.View
      style={{
        transform: [
          { perspective: 600 },
          { rotateX: flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }) },
        ],
      }}
    >
      {renderFace(shown)}
    </Animated.View>
  );
};

const EMPTY_GUESSES = ['', '', '', '', '', ''];

const buildKeyboardStatus = (
  guesses: string[],
  evaluations: TileEvaluation[][],
  base: { [key: string]: KeyStatus } = {}
) => {
  const status = { ...base };
  guesses.forEach((guess, guessIndex) => {
    const evaluation = evaluations[guessIndex];
    if (!guess || !evaluation) return;
    for (let i = 0; i < guess.length; i++) {
      const next = EVALUATION_TO_KEY[evaluation[i]];
      const current = status[guess[i]] ?? 'unused';
      if (KEY_RANK[next] > KEY_RANK[current]) status[guess[i]] = next;
    }
  });
  return status;
};

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 80) / 5;

interface WordleGameModalProps {
  visible: boolean;
  onClose: () => void;
}

const WordleGameModal: React.FC<WordleGameModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [solution, setSolution] = useState('');
  const [guesses, setGuesses] = useState<string[]>(EMPTY_GUESSES);
  const [evaluations, setEvaluations] = useState<TileEvaluation[][]>([]);
  const [currentGuessIndex, setCurrentGuessIndex] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState<{[key: string]: 'correct' | 'present' | 'absent' | 'unused'}>({});
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [streak, setStreak] = useState(0);
  const [streakEnded, setStreakEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (visible) {
      loadGameState();
    }
  }, [visible]);

  const loadGameState = async () => {
    if (!accessToken) {
      console.error("No access token found. Cannot load game state.");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const gameState = await WordleService.getTodayGame(accessToken);
      const serverGuesses = gameState.guesses || [];
      const serverEvaluations = gameState.evaluations || [];
      const padded = [...serverGuesses, ...EMPTY_GUESSES].slice(0, 6);

      if (gameState.hasPlayed) {
        setSolution(gameState.word || '');
        setGuesses(padded);
        setEvaluations(serverEvaluations);
        setCurrentGuessIndex(serverGuesses.length);
        setCurrentGuess('');
        setGameOver(true);
        setGameWon(gameState.won || false);
        setStreak(gameState.streak || 0);
        setAttempts(serverGuesses.length);
        setKeyboardStatus(buildKeyboardStatus(serverGuesses, serverEvaluations));

        setTimeout(() => {
          setShowResult(true);
        }, 500);
      } else if (serverGuesses.length > 0) {
        resetGame();
        setSolution('');
        setGuesses(padded);
        setEvaluations(serverEvaluations);
        setCurrentGuessIndex(serverGuesses.length);
        setAttempts(serverGuesses.length);
        setStreak(gameState.streak || 0);
        setKeyboardStatus(buildKeyboardStatus(serverGuesses, serverEvaluations));
      } else {
        resetGame();
        setSolution('');
        setStreak(gameState.streak || 0);

        setTimeout(() => {
            setShowHowToPlay(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      setMessage('Failed to load game. Please try again.');
      setTimeout(() => setMessage(''), 3000);
      resetGame();
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setGuesses(EMPTY_GUESSES);
    setEvaluations([]);
    setCurrentGuessIndex(0);
    setCurrentGuess('');
    setMessage('');
    setGameOver(false);
    setKeyboardStatus({});
    setGameWon(false);
    setStreakEnded(false);
    setAttempts(0);
  };

  const checkGuess = async () => {
    if (currentGuess.length !== 5) {
      setMessage('Word must be 5 letters.');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    if (!accessToken) {
      console.error("No access token found. Cannot submit game.");
      setMessage('Error: Not authenticated.');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    setValidating(true);
    let result;
    try {
      result = await WordleService.submitGuess(currentGuess, accessToken);
    } catch (error) {
      setMessage('Could not submit your guess. Try again.');
      setTimeout(() => setMessage(''), 2000);
      setValidating(false);
      return;
    }
    setValidating(false);

    if (!result.isValid || !result.evaluation) {
      setMessage('Not in word list');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const newGuesses = [...guesses];
    newGuesses[currentGuessIndex] = currentGuess;
    const newEvaluations = [...evaluations];
    newEvaluations[currentGuessIndex] = result.evaluation;

    setGuesses(newGuesses);
    setEvaluations(newEvaluations);
    setKeyboardStatus(buildKeyboardStatus([currentGuess], [result.evaluation], keyboardStatus));
    setAttempts(currentGuessIndex + 1);

    if (result.finished) {
      setGameOver(true);
      setGameWon(!!result.won);
      setSolution(result.word || '');
      setStreak(result.streak ?? 0);
      setStreakEnded(result.streakEnded || false);

      setTimeout(() => {
        setShowResult(true);
      }, 1700);
    } else {
      setCurrentGuessIndex(currentGuessIndex + 1);
      setCurrentGuess('');
    }
  };

  const handleKeyPress = (key: string) => {
    if (gameOver || validating) return;
    
    if (currentGuess.length < 5 && key !== 'ENTER' && key !== 'BACKSPACE') {
      setCurrentGuess(currentGuess + key.toUpperCase());
    } else if (key === 'ENTER') {
      checkGuess();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(currentGuess.slice(0, -1));
    }
  };

  const getTileStyle = (
    letter: string,
    guessIndex: number,
    letterIndex: number,
    shown?: TileEvaluation | null
  ) => {
    const evaluation = shown !== undefined ? shown ?? undefined : evaluations[guessIndex]?.[letterIndex];

    if (!evaluation) {
      if (guessIndex === currentGuessIndex && !gameOver && letterIndex < currentGuess.length) {
        return {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.primary,
          borderWidth: 2,
        };
      }
      return {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        borderWidth: 2,
      };
    }

    if (evaluation === 'green') {
      return {
        backgroundColor: '#6aaa64',
        borderColor: '#6aaa64',
        borderWidth: 2,
      };
    } else if (evaluation === 'yellow') {
      return {
        backgroundColor: '#c9b458',
        borderColor: '#c9b458',
        borderWidth: 2,
      };
    } else {
      return {
        backgroundColor: '#787c7e',
        borderColor: '#787c7e',
        borderWidth: 2,
      };
    }
  };

  const renderTile = (letter: string, guessIndex: number, letterIndex: number) => {
    return (
      <FlipTile
        key={letterIndex}
        evaluation={evaluations[guessIndex]?.[letterIndex]}
        delay={letterIndex * 200}
        renderFace={(shown) => (
          <View style={[styles.tile, getTileStyle(letter, guessIndex, letterIndex, shown)]}>
            <Text style={[styles.tileText, { color: shown ? 'white' : colors.text }]}>{letter}</Text>
          </View>
        )}
      />
    );
  };

  const getKeyStyle = (key: string) => {
    const status = keyboardStatus[key];
    const baseStyle = { backgroundColor: colors.backgroundSecondary };
    
    switch (status) {
      case 'correct':
        return { backgroundColor: '#6aaa64' };
      case 'present':
        return { backgroundColor: '#c9b458' };
      case 'absent':
        return { backgroundColor: '#787c7e' };
      default:
        return baseStyle;
    }
  };

  const renderKeyboard = () => {
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
    ];

    return (
      <View style={styles.keyboardContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyboardRow}>
            {row.map((key) => {
              const keyStyle = getKeyStyle(key);
              const textColor = keyStyle.backgroundColor === colors.backgroundSecondary ? colors.text : 'white';
              
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    key === 'ENTER' && styles.enterKey,
                    key === 'BACKSPACE' && styles.backspaceKey,
                    keyStyle,
                  ]}
                  onPress={() => handleKeyPress(key)}
                  disabled={validating || gameOver}
                >
                  {key === 'BACKSPACE' ? (
                    <Ionicons name="backspace-outline" size={16} color={textColor} />
                  ) : (
                    <ThemedText style={[styles.keyText, { color: textColor }]}>
                      {key}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const isGameModalVisible = visible && !showHowToPlay && !showResult;

  return (
    <>
      <ThemedModal 
          visible={isGameModalVisible}
          onClose={onClose} 
          containerStyle={styles.modalContent}
          fullHeight={true}
      >
        <ThemedView style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
            Today's Wordle
          </ThemedText>
          <TouchableOpacity onPress={loadGameState} style={styles.resetButton}>
            <Ionicons name="refresh" size={20} color={colors.text} />
          </TouchableOpacity>
        </ThemedView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <ThemedText style={styles.loadingText}>Loading game...</ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.gameContainer}>
              {guesses.map((guess, guessIndex) => (
                <View key={guessIndex} style={styles.row}>
                  {[...Array(5)].map((_, letterIndex) => {
                    const letter = guessIndex === currentGuessIndex && !gameOver 
                      ? currentGuess[letterIndex] || '' 
                      : guess[letterIndex] || '';
                    return renderTile(letter, guessIndex, letterIndex);
                  })}
                </View>
              ))}
            </View>

            {message ? (
              <View style={[styles.messageContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <ThemedText style={[styles.message, { color: colors.text }]}>{message}</ThemedText>
              </View>
            ) : null}

            {validating ? (
              <View style={styles.validatingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <ThemedText style={[styles.validatingText, { color: colors.textDim }]}>
                  Validating word...
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.instructionContainer}>
              <ThemedText style={[styles.instruction, { color: colors.textDim }]}>
                Guess the WORDLE in 6 tries. Each guess must be a valid 5-letter word.
              </ThemedText>
            </View>

            {renderKeyboard()}
          </>
        )}
      </ThemedModal>
      
      <HowToPlayModal
        visible={showHowToPlay} 
        onClose={() => setShowHowToPlay(false)}
      />

      <ResultModal
        visible={showResult}
        onClose={() => {
          setShowResult(false);
          onClose();
        }}
        won={gameWon}
        word={solution}
        streak={streak}
        streakEnded={streakEnded}
        attempts={attempts}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
  },
  modalCloseButton: {
    padding: 8,
    margin: -8,
  },
  resetButton: {
    padding: 8,
    margin: -8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  gameContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
    borderRadius: 4,
  },
  tileText: {
    fontSize: TILE_SIZE * 0.5,
    fontWeight: 'bold',
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    alignSelf: 'stretch',
  },
  message: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginVertical: 5,
  },
  validatingText: {
    marginLeft: 8,
    fontSize: 12,
  },
  instructionContainer: {
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  instruction: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  keyboardContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  key: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 4,
    minHeight: 44,
  },
  enterKey: {
    flex: 1.5,
  },
  backspaceKey: {
    flex: 1.5,
  },
  keyText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default WordleGameModal;