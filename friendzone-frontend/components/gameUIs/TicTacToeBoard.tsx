import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";
import Button from '@/components/Button';
import ThemedModal from '@/components/ThemedModal';

const { width: screenWidth } = Dimensions.get("window");
const PADDING = 20;
const LINE_WIDTH = 3;
const BOARD_DIM = screenWidth - PADDING * 2;
const CELL_SIZE = BOARD_DIM / 3;

interface TicTacToePlayer {
  userId: string;
  username: string;
  avatar: string | null;
  symbol: "X" | "O";
}

interface TicTacToeGameState {
  board: (string | null)[];
  players: TicTacToePlayer[];
  currentPlayer: string;
  status: "playing" | "completed" | "draw" | "pending";
  winner: string | null;
  message?: string;
  lastMove: { playerId: string; position: number; symbol: "X" | "O" } | null;
  initiatorId?: string;
}

interface TicTacToeBoardProps {
  gameState: TicTacToeGameState;
  currentUserId: string;
  onCellPress: (position: number) => void;
  onPlay: () => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({
  gameState,
  currentUserId,
  onCellPress,
  onPlay,
  onPlayAgain,
  onQuit,
}) => {
  const { colors } = useTheme();
  const [showQuitModal, setShowQuitModal] = useState(false);

  const renderCell = (index: number) => {
    const cellValue = gameState.board[index];
    const isLastMove = gameState.lastMove?.position === index;

    const cellStyles = [
      styles.cell,
      {
        borderColor: "white",
      },
      (index + 1) % 3 !== 0 && {
        borderRightWidth: LINE_WIDTH,
      },
      index < 6 && {
        borderBottomWidth: LINE_WIDTH,
      },
      isLastMove && {
        borderColor: colors.primary,
      },
    ];

    return (
      <TouchableOpacity
        key={index}
        style={cellStyles}
        onPress={() => onCellPress(index)}
        disabled={
          cellValue !== null ||
          gameState.status !== "playing" ||
          gameState.currentPlayer !== currentUserId
        }
      >
        <Text
          style={[
            styles.cellText,
            { color: "white" },
          ]}
        >
          {cellValue}
        </Text>
      </TouchableOpacity>
    );
  };

  const myPlayer = gameState.players.find((p) => p.userId === currentUserId);
  const opponentPlayer = gameState.players.find(
    (p) => p.userId !== currentUserId
  );
  const isGameOver = gameState.status === "completed" || gameState.status === "draw";
  const isInitiator = gameState.initiatorId === currentUserId;

  const renderActionButtons = () => {
    if (isGameOver) {
      return (
        <Button
          title="Play Again"
          onPress={onPlayAgain}
          style={styles.fullWidthButton}
        />
      );
    }
    
    if (gameState.status === 'pending') {
      if (isInitiator) {
        return (
          <>
            <Button
              title="Play"
              onPress={onPlay}
              style={[styles.actionButton, styles.actionButtonMargin]}
            />
            <Button
              title="Quit"
              onPress={() => setShowQuitModal(true)}
              style={styles.actionButton}
            />
          </>
        );
      } else {
        return (
          <>
            <ThemedText style={[styles.waitingMessageText, { color: 'white' }]}>
              Waiting for the sender to start the game...
            </ThemedText>
            <Button
              title="Quit"
              onPress={() => setShowQuitModal(true)}
              style={styles.fullWidthButton}
            />
          </>
        );
      }
    }
    
    return (
      <Button
        title="Quit"
        onPress={() => setShowQuitModal(true)}
        style={styles.fullWidthButton}
      />
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View
        style={[styles.playerInfoContainer, { borderColor: "white", backgroundColor: 'transparent' }]}
      >
        {myPlayer && (
          <ThemedView style={[styles.playerInfo, { backgroundColor: 'transparent' }]}>
            <Image
              source={{ uri: myPlayer.avatar || undefined }}
              style={[
                styles.playerAvatar,
                gameState.currentPlayer === myPlayer.userId && styles.activePlayerBorder,
              ]}
            />
            <ThemedText style={[styles.playerName, { color: "white" }]}>
              You ({myPlayer.symbol})
            </ThemedText>
          </ThemedView>
        )}
        <ThemedText style={[styles.vsText, { color: "white" }]}>VS</ThemedText>
        {opponentPlayer && (
          <ThemedView style={[styles.playerInfo, { backgroundColor: 'transparent' }]}>
            <Image
              source={{ uri: opponentPlayer.avatar || undefined }}
              style={[
                styles.playerAvatar,
                gameState.currentPlayer === opponentPlayer.userId && styles.activePlayerBorder,
              ]}
            />
            <ThemedText style={[styles.playerName, { color: "white" }]}>
              {opponentPlayer.username} ({opponentPlayer.symbol})
            </ThemedText>
          </ThemedView>
        )}
      </View>
      
      <View style={[styles.board, { backgroundColor: 'transparent' }]}>
        {[...Array(9)].map((_, index) => renderCell(index))}
      </View>

      <View style={styles.bottomButtonsRow}>
        {renderActionButtons()}
      </View>

      {showQuitModal && (
        <ThemedModal visible={showQuitModal} onClose={() => setShowQuitModal(false)}>
          <ThemedText
            type="subtitle"
            style={[styles.modalTitle, { color: colors.textSecondary }]}
          >
            Are you sure you want to quit the game?
          </ThemedText>
          <View style={styles.modalButtonRow}>
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
          </View>
        </ThemedModal>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  playerInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    marginVertical: 40,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  playerInfo: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  playerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activePlayerBorder: {
    borderColor: "#7289DA",
  },
  playerName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  vsText: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  board: {
    width: BOARD_DIM,
    height: BOARD_DIM,
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 40,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  cellText: {
    fontSize: CELL_SIZE * 0.6,
    fontWeight: "bold",
  },
  bottomButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 20,
    marginBottom: 10,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonMargin: {
    marginRight: 8,
  },
  fullWidthButton: {
    width: "100%",
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
  waitingMessageText: {
    textAlign: 'center',
    marginBottom: 10,
    flex: 1,
  },
});

export default TicTacToeBoard;