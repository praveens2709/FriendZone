import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from "react-native";
import ThemedModal from "@/components/ThemedModal";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import HowToPlayModal from "./HowToPlayModal";
import ResultModal from "./ResultModal";
import WordleService from "@/services/WordleService";
import { useAuth } from "@/context/AuthContext";

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
  const [guesses, setGuesses] = useState<string[]>(['', '', '', '', '', '']);
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
      
      if (gameState.word) {
        setSolution(gameState.word);
      }
      
      if (gameState.hasPlayed) {
        const playedGuesses = gameState.guesses || ['', '', '', '', '', ''];
        setGuesses(playedGuesses);
        setCurrentGuessIndex(playedGuesses.length || 0);
        setGameOver(true);
        setGameWon(gameState.won || false);
        setStreak(gameState.streak || 0);
        setAttempts(playedGuesses.filter(g => g !== '').length);
        
        const playedWord = solution || gameState.word;
        
        if (playedWord && playedGuesses.length > 0) {
          const newKeyboardStatus: {[key: string]: 'correct' | 'present' | 'absent' | 'unused'} = {};
          playedGuesses.forEach((guess: string) => {
            if (guess) {
              for (let i = 0; i < guess.length; i++) {
                const letter = guess[i];
                const isCorrectPosition = playedWord[i] === letter;
                const isPresentInWord = playedWord.includes(letter);
                
                if (isCorrectPosition) {
                  newKeyboardStatus[letter] = 'correct';
                } else if (isPresentInWord && newKeyboardStatus[letter] !== 'correct') {
                  newKeyboardStatus[letter] = 'present';
                } else if (!isPresentInWord) {
                  newKeyboardStatus[letter] = 'absent';
                }
              }
            }
          });
          setKeyboardStatus(newKeyboardStatus);
        }
        
        setTimeout(() => {
          setShowResult(true);
        }, 500);
      } else {
        resetGame();
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
    setGuesses(['', '', '', '', '', '']);
    setCurrentGuessIndex(0);
    setCurrentGuess('');
    setMessage('');
    setGameOver(false);
    setKeyboardStatus({});
    setGameWon(false);
    setStreakEnded(false);
    setAttempts(0);
  };

  const updateKeyboardStatus = (guess: string) => {
    const newStatus = { ...keyboardStatus };
    
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const isCorrectPosition = solution[i] === letter;
      const isPresentInWord = solution.includes(letter);
      
      if (isCorrectPosition) {
        newStatus[letter] = 'correct';
      }
      else if (isPresentInWord && newStatus[letter] !== 'correct') {
        newStatus[letter] = 'present';
      }
      else if (!isPresentInWord) {
        newStatus[letter] = 'absent';
      }
    }
    
    setKeyboardStatus(newStatus);
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
    try {
      const isValid = await WordleService.validateWord(currentGuess, accessToken);
      
      if (!isValid) {
        setMessage('Not in word list');
        setTimeout(() => setMessage(''), 2000);
        setValidating(false);
        return;
      }
    } catch (error) {
      console.error('Error validating word:', error);
      setMessage('Error validating word');
      setTimeout(() => setMessage(''), 2000);
      setValidating(false);
      return;
    }
    setValidating(false);

    const newGuesses = [...guesses];
    newGuesses[currentGuessIndex] = currentGuess;
    setGuesses(newGuesses);
    
    updateKeyboardStatus(currentGuess);

    const isWin = currentGuess.toUpperCase() === solution.toUpperCase();
    const isLastAttempt = currentGuessIndex === 5;
    const finalAttempts = currentGuessIndex + 1;
    setAttempts(finalAttempts);

    if (isWin || isLastAttempt) {
      setGameOver(true);
      setGameWon(isWin);

      try {
        const result = await WordleService.submitGame({
          guesses: newGuesses.filter(g => g !== ''),
          won: isWin,
          word: solution
        }, accessToken);

        setStreak(result.streak);
        setStreakEnded(result.streakEnded || false);

      } catch (error) {
        console.error('Error submitting game:', error);
        setMessage('Game submitted with error. Check backend logs.');
      }
      
      setTimeout(() => {
        setShowResult(true);
      }, 1000); 

    } else {
      setCurrentGuessIndex(currentGuessIndex + 1);
      setCurrentGuess('');
    }
  };

  const handleKeyPress = (key: string) => {
    if (gameOver || validating || !solution) return;
    
    if (currentGuess.length < 5 && key !== 'ENTER' && key !== 'BACKSPACE') {
      setCurrentGuess(currentGuess + key.toUpperCase());
    } else if (key === 'ENTER') {
      checkGuess();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(currentGuess.slice(0, -1));
    }
  };

  const getTileStyle = (letter: string, guessIndex: number, letterIndex: number) => {
    const guess = guesses[guessIndex];
    const hasGuess = guessIndex < currentGuessIndex || (guessIndex === currentGuessIndex && gameOver);
    
    if (!hasGuess) {
      if (guessIndex === currentGuessIndex && letterIndex < currentGuess.length) {
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

    const isCorrectPosition = guess[letterIndex] === solution[letterIndex];
    const isCorrectLetter = solution.includes(guess[letterIndex]);

    if (isCorrectPosition) {
      return {
        backgroundColor: '#6aaa64',
        borderColor: '#6aaa64',
        borderWidth: 2,
      };
    } else if (isCorrectLetter) {
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
    const tileStyle = getTileStyle(letter, guessIndex, letterIndex);
    const textColor = tileStyle.backgroundColor === 'transparent' ? colors.text : 'white';

    return (
      <View key={letterIndex} style={[styles.tile, tileStyle]}>
        <Text style={[styles.tileText, { color: textColor }]}>{letter}</Text>
      </View>
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
                  disabled={validating || !solution}
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
            <ActivityIndicator size="large" color={colors.primary} />
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
                <ActivityIndicator size="small" color={colors.primary} />
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