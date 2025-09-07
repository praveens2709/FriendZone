// SnakeLadderBoard.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, TouchableOpacity, Image, Dimensions, Animated, Easing, ImageBackground } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import Button from '@/components/Button';
import ThemedModal from '@/components/ThemedModal';
import { ThemedView } from "../ThemedView";

const { width: screenWidth } = Dimensions.get("window");
const BOARD_DIM = screenWidth - 10;
const CELL_SIZE = BOARD_DIM / 10;

interface PlayerInfo {
  userId: string;
  username: string;
  avatar: string | null;
  position: number;
}
interface GameStateAnimationData {
  playerId: string;
  fromPosition: number;
  toPosition: number;
  diceRoll: number;
}
interface SnakeLadderGameState {
  players: PlayerInfo[];
  boardSize: number;
  snakes: { head: number; tail: number }[];
  ladders: { bottom: number; top: number }[];
  currentPlayer: string;
  lastDiceRoll: number;
  message?: string;
  status: "playing" | "waiting" | "gameOver" | "draw" | "completed" | "pending";
  winner?: string;
  animationData?: GameStateAnimationData;
}
interface SnakeLadderBoardProps {
  gameState: SnakeLadderGameState;
  currentUserId: string;
  onRollDice: () => void;
  onPlay: () => void;
  onPlayAgain: () => void;
  onQuit: () => void;
  showWaitingOverlay: boolean;
  waitingMessage: string;
}

const diceImages: { [key: number]: any } = {
  1: require("@/assets/images/one.jpg"),
  2: require("@/assets/images/two.jpg"),
  3: require("@/assets/images/three.jpg"),
  4: require("@/assets/images/four.jpg"),
  5: require("@/assets/images/five.jpg"),
  6: require("@/assets/images/six.jpg"),
};

const getCellCoordinates = (cellNumber: number) => {
  const zeroIndexedRow = Math.floor((cellNumber - 1) / 10);
  const visualRowFromTop = 9 - zeroIndexedRow;
  let col;
  if (zeroIndexedRow % 2 === 0) {
    col = (cellNumber - 1) % 10;
  } else {
    col = 9 - ((cellNumber - 1) % 10);
  }
  const left = col * CELL_SIZE;
  const top = visualRowFromTop * CELL_SIZE;
  return { x: left, y: top };
};

const SnakeLadderBoard: React.FC<SnakeLadderBoardProps> = ({
  gameState,
  currentUserId,
  onRollDice,
  onPlay,
  onPlayAgain,
  onQuit,
  showWaitingOverlay,
  waitingMessage,
}) => {
  const { colors } = useTheme();
  const [showQuitModal, setShowQuitModal] = useState(false);
  const diceSpinValue = useRef(new Animated.Value(0)).current;
  const [isDiceAnimating, setIsDiceAnimating] = useState(false);
  const [currentDisplayedDice, setCurrentDisplayedDice] = useState(1);
  const playerAnimValues = useRef<{ [key: string]: Animated.ValueXY }>({});
  const playerAnimatedPositionsRef = useRef<{ [key: string]: number }>({});
  const playerTokenSize = CELL_SIZE * 0.6;

  useEffect(() => {
    gameState.players.forEach((player) => {
      if (!playerAnimValues.current[player.userId]) {
        const initialCoords = getCellCoordinates(player.position);
        playerAnimValues.current[player.userId] = new Animated.ValueXY(initialCoords);
        playerAnimValues.current[player.userId].addListener(() => {});
        playerAnimatedPositionsRef.current[player.userId] = player.position;
      }
    });
    return () => {
      Object.values(playerAnimValues.current).forEach(val => val.removeAllListeners());
    };
  }, [gameState.players]);

  useEffect(() => {
    if (gameState.lastDiceRoll > 0 && !isDiceAnimating) {
      setIsDiceAnimating(true);
      diceSpinValue.setValue(0);
      setCurrentDisplayedDice(Math.floor(Math.random() * 6) + 1);
      let rollCounter = 0;
      const totalSpins = 15;
      const spinDuration = 60;
      const animateDiceSpin = () => {
        rollCounter++;
        setCurrentDisplayedDice(Math.floor(Math.random() * 6) + 1);
        if (rollCounter < totalSpins) {
          setTimeout(animateDiceSpin, spinDuration);
        } else {
          setCurrentDisplayedDice(gameState.lastDiceRoll);
          Animated.timing(diceSpinValue, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start(() => {
            setIsDiceAnimating(false);
          });
        }
      };
      animateDiceSpin();
    }
  }, [gameState.lastDiceRoll, currentDisplayedDice, isDiceAnimating, diceSpinValue]);

  useEffect(() => {
    if (gameState.animationData) {
      const { playerId, fromPosition, toPosition } = gameState.animationData;
      const playerAnim = playerAnimValues.current[playerId];
      const actualPlayerCurrentPosition = gameState.players.find(p => p.userId === playerId)?.position;
      if (playerAnim && playerAnimatedPositionsRef.current[playerId] === fromPosition) {
        const path = [];
        for (let i = fromPosition + 1; i <= toPosition; i++) {
          path.push(getCellCoordinates(i));
        }
        if (actualPlayerCurrentPosition && actualPlayerCurrentPosition !== toPosition) {
          const finalJumpCoords = getCellCoordinates(actualPlayerCurrentPosition);
          path.push(finalJumpCoords);
        }
        if (path.length === 0) return;
        const animations = path.map((coords, index) => {
          const isFinalJump = (index === path.length - 1 && actualPlayerCurrentPosition !== toPosition);
          const stepDuration = isFinalJump ? 300 : 150;
          return Animated.timing(playerAnim, {
            toValue: coords,
            duration: stepDuration,
            easing: Easing.linear,
            useNativeDriver: true,
          });
        });
        playerAnimatedPositionsRef.current[playerId] = actualPlayerCurrentPosition || toPosition;
        Animated.sequence(animations).start(() => {
          const finalCoords = getCellCoordinates(actualPlayerCurrentPosition || toPosition);
          playerAnim.setValue(finalCoords);
        });
      } else if (playerAnim && playerAnimatedPositionsRef.current[playerId] !== (actualPlayerCurrentPosition || toPosition)) {
        const finalCoords = getCellCoordinates(actualPlayerCurrentPosition || toPosition);
        playerAnim.setValue(finalCoords);
        playerAnimatedPositionsRef.current[playerId] = actualPlayerCurrentPosition || toPosition;
      }
    } else {
      gameState.players.forEach(player => {
        const playerAnim = playerAnimValues.current[player.userId];
        const currentCoords = getCellCoordinates(player.position);
        if (playerAnim && playerAnimatedPositionsRef.current[player.userId] !== player.position) {
          playerAnim.setValue(currentCoords);
          playerAnimatedPositionsRef.current[player.userId] = player.position;
        }
      });
    }
  }, [gameState.animationData, gameState.players]);

  const renderPlayers = useCallback(() => {
    const positionMap: { [pos: number]: PlayerInfo[] } = {};
    gameState.players.forEach((player: PlayerInfo) => {
      if (!positionMap[player.position]) positionMap[player.position] = [];
      positionMap[player.position].push(player);
    });
    return Object.entries(positionMap).map(([pos, playersAtPos]) => {
      const coords = getCellCoordinates(Number(pos));
      return (
        <ThemedView
          key={pos}
          style={{
            position: 'absolute',
            left: coords.x,
            top: coords.y,
            width: playerTokenSize * 1.2,
            height: playerTokenSize * 1.2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {playersAtPos.map((player: PlayerInfo, idx: number) => {
            const offset = idx * (playerTokenSize * 0.35);
            return (
              <Animated.View
                key={player.userId}
                style={[
                  styles.playerToken,
                  {
                    zIndex: 2 + idx,
                    backgroundColor: player.userId === currentUserId ? colors.primary : colors.tint,
                    width: playerTokenSize,
                    height: playerTokenSize,
                    borderRadius: playerTokenSize / 2,
                    position: 'absolute',
                    left: offset,
                    top: offset,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                {player.avatar ? (
                  <Image
                    source={{ uri: player.avatar }}
                    style={styles.playerAvatar}
                  />
                ) : (
                  <ThemedText style={{ fontSize: 10, color: colors.buttonText }}>
                    {player.username ? player.username[0].toUpperCase() : '?'}
                    {player.userId === currentUserId ? '*' : ''}
                  </ThemedText>
                )}
              </Animated.View>
            );
          })}
        </ThemedView>
      );
    });
  }, [gameState.players, currentUserId, colors, playerTokenSize]);

  const isMyTurn = gameState.currentPlayer === currentUserId;
  const canRoll = isMyTurn && gameState.status === "playing" && !isDiceAnimating;
  const isGameOver = gameState.status === "gameOver" || gameState.status === "completed" || gameState.status === "draw";

  return (
    <ThemedView style={styles.boardContainer}>
      <ImageBackground
        source={require("@/assets/images/snakeandladder.webp")}
        style={styles.boardGrid}
        resizeMode="contain"
      >
        {renderPlayers()}
      </ImageBackground>
      <ThemedView style={styles.controlsContainer}>
        {gameState.status === "playing" && (
          <ThemedText style={[styles.currentPlayerText, { color: colors.textDim }]}> {isMyTurn ? "It's your turn!" : `Waiting for ${gameState.players.find((p) => p.userId === gameState.currentPlayer)?.username || "opponent"}'s turn`} </ThemedText>
        )}
        {(isDiceAnimating || currentDisplayedDice > 0) && !isGameOver && (
          <TouchableOpacity
            activeOpacity={canRoll ? 0.7 : 1}
            onPress={canRoll ? onRollDice : undefined}
            disabled={!canRoll}
            style={styles.diceWrapper}
          >
            <Animated.Image
              source={diceImages[currentDisplayedDice]}
              style={[
                styles.diceImage,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                  transform: [
                    {
                      rotate: diceSpinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                    {
                      scale: diceSpinValue.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.8, 1.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          </TouchableOpacity>
        )}
        {isGameOver ? (
          <ThemedText style={[styles.gameOverText, { color: colors.error }]}> Game Over!{' '}
            {gameState.winner
              ? `${gameState.players.find((p) => p.userId === gameState.winner)?.username || "A player"} won!`
              : "It's a draw!"}
          </ThemedText>
        ) : null}
      </ThemedView>
      <ThemedView style={styles.bottomButtonsRow}>
        {isGameOver ? (
          <Button title="Play Again" onPress={onPlayAgain} style={styles.fullWidthButton} />
        ) : (
          <>
            <Button title="Play" onPress={onPlay} style={[styles.actionButton, styles.actionButtonMargin]} />
            <Button title="Quit" onPress={() => setShowQuitModal(true)} style={styles.actionButton} />
          </>
        )}
      </ThemedView>
      {showQuitModal && (
        <ThemedModal visible={showQuitModal} onClose={() => setShowQuitModal(false)}>
          <ThemedText
            type="subtitle"
            style={[styles.modalTitle, { color: colors.textSecondary }]}
          >
            Are you sure you want to quit the game?
          </ThemedText>
          <ThemedView style={styles.modalButtonRow}>
            <Button
              title="Cancel"
              onPress={() => setShowQuitModal(false)}
              style={[styles.actionButton, styles.actionButtonMargin]}
            />
            <Button
              title="Yes, Quit"
              onPress={() => { onQuit(); setShowQuitModal(false); }}
              style={styles.actionButton}
            />
          </ThemedView>
        </ThemedModal>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  boardContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  boardGrid: {
    width: BOARD_DIM,
    height: BOARD_DIM,
    position: 'relative',
    alignSelf: 'center',
  },
  playerToken: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 1,
    borderColor: 'white',
    borderWidth: 1,
    overflow: 'hidden',
  },
  playerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    resizeMode: 'cover',
  },
  diceWrapper: {
    marginVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 15,
    overflow: 'visible',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  diceImage: {
    width: 60,
    height: 60,
    borderRadius: 15,
    borderWidth: 2,
  },
  controlsContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '90%',
  },
  currentPlayerText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  lastRollText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  rollDiceButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  rollDiceButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameOverText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonMargin: {
    marginRight: 8,
  },
  fullWidthButton: {
    width: '100%',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 25,
  },
});

export default SnakeLadderBoard;