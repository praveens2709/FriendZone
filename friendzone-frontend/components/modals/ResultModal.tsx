import React from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedModal from "@/components/ThemedModal";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import CircleBoard from "@/components/CircleBoard";
import Confetti from "@/components/Confetti";
import ArtBackground from "@/components/ui/ArtBackground";
import { ART } from "@/constants/artPalettes";

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

  const accent = won ? '#6aaa64' : '#e74c3c';

  return (
    <ThemedModal visible={visible} onClose={onClose} fullHeight>
      <Confetti active={visible && won} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        bounces={false}
      >
        <View style={styles.art}>
          <ArtBackground palette={(won ? ART.win : ART.lose).palette} glyph={(won ? ART.win : ART.lose).glyph} watermark={130} />
          <MaterialIcons
            name={won ? 'celebration' : 'sentiment-dissatisfied'}
            size={52}
            color="white"
          />
        </View>

        <ThemedText style={styles.title}>{won ? 'Congratulations! 🎉' : 'Game Over'}</ThemedText>

        <ThemedText style={[styles.description, { color: colors.textDim }]}>
          {won
            ? `You guessed the word in ${attempts || 6} ${attempts === 1 ? 'try' : 'tries'}!`
            : 'Better luck next time!'}
        </ThemedText>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.buttonBackgroundSecondary }]}>
            <ThemedText style={[styles.statLabel, { color: colors.textDim }]}>The word</ThemedText>
            <ThemedText style={[styles.wordText, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
              {word.toUpperCase()}
            </ThemedText>
          </View>
          {won && streak > 0 && (
            <View style={[styles.statCard, { backgroundColor: colors.buttonBackgroundSecondary }]}>
              <ThemedText style={[styles.statLabel, { color: colors.textDim }]}>Streak</ThemedText>
              <ThemedText style={[styles.streakValue, { fontSize: Math.min(26 + streak * 2, 44), lineHeight: Math.min(32 + streak * 2, 50) }]}>
                {streak} {streak >= 7 ? "🔥🔥🔥" : streak >= 3 ? "🔥🔥" : "🔥"}
              </ThemedText>
            </View>
          )}
        </View>

        {!won && streakEnded && (
          <View style={styles.streakEndedContainer}>
            <MaterialIcons name="heart-broken" size={20} color="#e74c3c" />
            <ThemedText style={styles.streakEndedText}>Your streak has ended</ThemedText>
          </View>
        )}

        <ThemedText style={[styles.comeBackText, { color: colors.textDim }]}>
          Come back tomorrow for a new word!
        </ThemedText>

        <View style={styles.board}>
          <CircleBoard visible={visible} />
        </View>
      </ScrollView>
    </ThemedModal>
  );
};

const styles = StyleSheet.create({
  header: { width: "100%", flexDirection: "row", alignItems: "center", marginBottom: 4 },
  closeButton: { padding: 8, margin: -8 },
  container: { alignItems: "center", paddingBottom: 8 },
  art: {
    width: "100%",
    height: 112,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  description: { fontSize: 15, marginBottom: 16, textAlign: "center" },
  statsRow: { width: "100%", flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14, alignItems: "center" },
  statLabel: { fontSize: 12, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  wordText: { fontSize: 28, lineHeight: 34, fontWeight: "bold", letterSpacing: 3 },
  streakValue: { fontSize: 28, lineHeight: 34, fontWeight: "bold" },
  streakEndedContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
    backgroundColor: "rgba(231,76,60,0.12)",
  },
  streakEndedText: { fontSize: 14, fontWeight: "600", color: "#e74c3c" },
  comeBackText: { fontSize: 14, marginBottom: 16, textAlign: "center", fontWeight: "500" },
  board: { width: "100%" },
});

export default ResultModal;