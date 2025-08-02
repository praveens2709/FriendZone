import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, ActivityIndicator, Alert, ImageBackground } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { showToast } from "@/constants/Functions";
import SnakeLadderBoard from "@/components/gameUIs/SnakeLadderBoard";
import TicTacToeBoard from "@/components/gameUIs/TicTacToeBoard";

const GAMING_BACKGROUND_IMAGE = require("@/assets/images/gaming-bg.png");

interface GameState {
  status:
    | "playing"
    | "waiting"
    | "gameOver"
    | "draw"
    | "paused"
    | "completed"
    | "pending";
  winner?: string;
  message?: string;
  players?: Array<{
    userId: string;
    username: string;
    avatar: string | null;
    symbol?: "X" | "O";
    position?: number;
  }>;
  boardSize?: number;
  dynamicSnakes?: any[];
  dynamicLadders?: any[];
  currentPlayer?: string;
  lastDiceRoll?: number;
  board?: (string | null)[];
  animationData?: any;
  lastMove?: { playerId: string; position: number; symbol: "X" | "O" };
  initiatorId?: string;
}

export default function GameSessionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string; gameId: string }>();

  const gameSessionId = params.id;
  const gameIdentifier = params.gameId;
  const currentUserId = user?._id;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [isMakingMove, setIsMakingMove] = useState(false);

  useEffect(() => {
    if (!socket || !gameSessionId || !currentUserId) {
      if (!gameSessionId || !currentUserId) {
        router.replace("/games");
        return;
      }
      return;
    }

    console.log(`[GameSessionScreen] Joining game session: ${gameSessionId}`);
    socket.emit("joinGameSession", gameSessionId);
    socket.emit("requestGameState", gameSessionId);
    setLoadingGame(true);

    const handleGameStateUpdate = (updatedState: GameState) => {
      console.log(
        "[GameSessionScreen] Received gameStateUpdate:",
        updatedState
      );
      setGameState(updatedState);
      setLoadingGame(false);
      setIsMakingMove(false);

      if (updatedState.status === "completed") {
        const winnerName =
          updatedState.players?.find((p) => p.userId === updatedState.winner)
            ?.username || "A player";
        Alert.alert("Game Over!", `${winnerName} won!`);
      } else if (updatedState.status === "draw") {
        Alert.alert("Game Over!", "It's a draw!");
      }
    };

    const handleGameError = (errorMsg: string) => {
      console.error("[GameSessionScreen] Received gameError:", errorMsg);
      showToast("error", `Game Error: ${errorMsg}`);
      setIsMakingMove(false);
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);
    socket.on("gameError", handleGameError);

    return () => {
      console.log(
        "[GameSessionScreen] Cleaning up socket listeners and leaving session."
      );
      socket.off("gameStateUpdate", handleGameStateUpdate);
      socket.off("gameError", handleGameError);
      if (gameSessionId) {
        socket.emit("leaveGameSession", gameSessionId);
      }
    };
  }, [socket, gameSessionId, currentUserId, router]);

  const handleMakeMove = useCallback(
    (moveData: any) => {
      console.log("[GameSessionScreen] handleMakeMove called with:", moveData);
      if (!socket) {
        showToast("error", "Socket connection not ready.");
        console.warn("[GameSessionScreen] handleMakeMove: Socket not ready.");
        return;
      }
      if (
        !gameState ||
        isMakingMove ||
        gameState.status !== "playing" ||
        gameState.currentPlayer !== currentUserId
      ) {
        const message =
          gameState?.message || "Not your turn or game not ready.";
        showToast("info", message);
        console.warn("[GameSessionScreen] Invalid move attempt:", {
          gameStateStatus: gameState?.status,
          isMakingMove,
          currentPlayer: gameState?.currentPlayer,
          currentUserId,
        });
        return;
      }
      setIsMakingMove(true);
      socket.emit("makeMove", {
        gameSessionId: gameSessionId,
        playerId: currentUserId,
        move: moveData,
      });
      console.log("[GameSessionScreen] Emitted makeMove event.");
    },
    [socket, gameState, isMakingMove, currentUserId, gameSessionId]
  );
  
  const handlePlayAgain = useCallback(() => {
    if (!socket || !gameSessionId) {
      showToast("error", "Socket connection not ready.");
      return;
    }
    console.log("[GameSessionScreen] Requesting to play again.");
    socket.emit("requestPlayAgain", gameSessionId);
    router.replace("/games");
  }, [socket, gameSessionId, router]);

  const handlePlay = useCallback(() => {
    if (!socket || !gameSessionId) {
        showToast("error", "Socket connection not ready.");
        return;
    }
    if (gameState?.status === "pending" && gameState?.initiatorId === currentUserId) {
        console.log("[GameSessionScreen] Emitting 'startGame' event.");
        socket.emit("startGame", { gameSessionId });
    } else {
        showToast("info", "Only the game initiator can start the game.");
    }
  }, [socket, gameState, gameSessionId, currentUserId]);

  const renderGameSpecificUI = () => {
    if (!gameState) {
      console.warn(
        "[GameSessionScreen] GameState is null, cannot render game UI."
      );
      return null;
    }
    console.log(`[GameSessionScreen] Rendering UI for game: ${gameIdentifier}`);
    switch (gameIdentifier) {
      case "snake_ladder":
        return (
          <SnakeLadderBoard
            gameState={gameState as any}
            currentUserId={currentUserId!}
            onRollDice={() => handleMakeMove({ type: "rollDice" })}
            onPlay={handlePlay}
            onPlayAgain={handlePlayAgain}
            onQuit={() => {
              router.replace("/games");
            }}
            showWaitingOverlay={gameState.status === "pending"}
            waitingMessage={
              gameState.status === "pending"
                ? "Waiting for all players to accept the invite..."
                : ""
            }
          />
        );
      case "tic_tac_toe":
        return (
          <TicTacToeBoard
            gameState={gameState as any}
            currentUserId={currentUserId!}
            onCellPress={(position) =>
              handleMakeMove({ type: "placeSymbol", position })
            }
            onPlay={handlePlay}
            onPlayAgain={handlePlayAgain}
            onQuit={() => {
              router.replace("/games");
            }}
          />
        );
      default:
        return (
          <ThemedView style={styles.unknownGameContainer}>
            <ThemedText
              style={[styles.unknownGameText, { color: colors.error }]}
            >
              Game not implemented: {gameIdentifier}
            </ThemedText>
          </ThemedView>
        );
    }
  };

  if (loadingGame || !gameState) {
    return (
      <ImageBackground source={GAMING_BACKGROUND_IMAGE} style={styles.loadingContainer}>
        <ThemedSafeArea style={styles.safeArea}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>
            Loading {gameIdentifier || "game"}...
          </ThemedText>
        </ThemedSafeArea>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={GAMING_BACKGROUND_IMAGE} style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
        <View style={styles.gameContent}>
          {renderGameSpecificUI()}
          {isMakingMove && (
            <ThemedText
              style={[styles.makingMoveText, { color: colors.primary }]}
            >
              Sending move...
            </ThemedText>
          )}
        </View>
      </ThemedSafeArea>
      {gameState?.status === "pending" && (
        <View style={styles.fullScreenOverlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="small" color="#fff" />
            <ThemedText style={styles.overlayText}>
              {gameIdentifier === "snake_ladder"
                ? "Waiting for all players to accept the invite..."
                : "Waiting for opponent to accept the invite..."}
            </ThemedText>
          </View>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
  },
  gameContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  unknownGameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  unknownGameText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  makingMoveText: {
    fontSize: 14,
    marginTop: 10,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: {
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    marginTop: 15,
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
});