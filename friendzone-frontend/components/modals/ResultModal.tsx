import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedModal from "@/components/ThemedModal";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import CircleBoard from "@/components/CircleBoard";

interface ResultModalProps {
  visible: boolean;
  onClose: () => void;
  won: boolean;
  word: string;
  streak: number;
  streakEnded: boolean;
  attempts?: number;
}

const ResultModal: React.FC<ResultModalProps> = ({
  visible,
  onClose,
  won,
  word,
  streak,
  streakEnded,
  attempts,
}) => {
  const { colors } = useTheme();

  return (
    <ThemedModal visible={visible} onClose={onClose}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }} />
        </View>

        {won ? (
          <>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#6aaa64' }]}>
                <MaterialIcons name="celebration" size={64} color="white" />
              </View>
            </View>

            <ThemedText style={styles.title}>Congratulations! 🎉</ThemedText>
            
            <ThemedText style={[styles.description, { color: colors.text }]}>
              You guessed the word in {attempts || 6} {attempts === 1 ? 'try' : 'tries'}!
            </ThemedText>

            <View style={[styles.wordContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <ThemedText style={[styles.wordLabel, { color: colors.textDim }]}>
                The word was
              </ThemedText>
              <ThemedText style={[styles.wordText, { color: '#6aaa64' }]}>
                {word.toUpperCase()}
              </ThemedText>
            </View>

            {streak > 0 && (
              <View style={[styles.streakContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <ThemedText style={[styles.streakLabel, { color: colors.textDim }]}>
                  Current Streak
                </ThemedText>
                <ThemedText style={styles.streakValue}>{streak} 🔥</ThemedText>
              </View>
            )}

            <ThemedText style={[styles.comeBackText, { color: colors.textDim }]}>
              Come back tomorrow for a new word!
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#e74c3c' }]}>
                <MaterialIcons name="sentiment-dissatisfied" size={64} color="white" />
              </View>
            </View>

            <ThemedText style={styles.title}>Game Over</ThemedText>
            
            <ThemedText style={[styles.description, { color: colors.text }]}>
              Better luck next time!
            </ThemedText>

            <View style={[styles.wordContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <ThemedText style={[styles.wordLabel, { color: colors.textDim }]}>
                The word was
              </ThemedText>
              <ThemedText style={[styles.wordText, { color: '#e74c3c' }]}>
                {word.toUpperCase()}
              </ThemedText>
            </View>

            {streakEnded && (
              <View style={[styles.streakEndedContainer, { backgroundColor: '#fff5f5' }]}>
                <MaterialIcons name="heart-broken" size={24} color="#e74c3c" />
                <ThemedText style={[styles.streakEndedText, { color: '#e74c3c' }]}>
                  Your streak has ended
                </ThemedText>
              </View>
            )}

            <ThemedText style={[styles.comeBackText, { color: colors.textDim }]}>
              Come back tomorrow for a new word!
            </ThemedText>
          </>
        )}
        <CircleBoard visible={visible} />
      </ThemedView>
    </ThemedModal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  closeButton: {
    padding: 8,
    margin: -8,
  },
  iconContainer: {
    marginVertical: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  wordContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    minWidth: 200,
    alignItems: "center",
  },
  wordLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  wordText: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  streakContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    minWidth: 180,
    alignItems: "center",
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  streakValue: {
    fontSize: 40,
    fontWeight: "bold",
    lineHeight: 48,
  },
  streakEndedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  streakEndedText: {
    fontSize: 14,
    fontWeight: "600",
  },
  comeBackText: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default ResultModal;