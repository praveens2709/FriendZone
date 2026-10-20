import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import CircleBoard from "@/components/CircleBoard";
import Card from "@/components/ui/Card";
import { useTheme } from "@/context/ThemeContext";

const TILES = [
  { letter: "K", color: "#6aaa64" },
  { letter: "N", color: "#c9b458" },
  { letter: "O", color: "#787c7e" },
  { letter: "C", color: "#6aaa64" },
  { letter: "K", color: "#c9b458" },
];

export default function RitualCard({
  hasPlayed,
  streak,
  refreshKey,
  onPlay,
}: {
  hasPlayed: boolean;
  streak: number;
  refreshKey: number;
  onPlay: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.tiles}>
          {TILES.map((tile, index) => (
            <View key={index} style={[styles.tile, { backgroundColor: tile.color }]}>
              <Text style={styles.tileLetter}>{tile.letter}</Text>
            </View>
          ))}
        </View>
        {streak > 0 && (
          <View style={[styles.streak, { backgroundColor: colors.primary + "1F" }]}>
            <Ionicons name="flame" size={16} color={colors.primary} />
            <Text style={[styles.streakText, { color: colors.text }]}>{streak}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        {hasPlayed ? "Nice. See you tomorrow." : "One word. Six tries."}
      </Text>
      <Text style={[styles.sub, { color: colors.textDim }]}>
        {hasPlayed
          ? "Check how your circle did today."
          : "Everyone in your circle gets the same word today."}
      </Text>

      <Button title={hasPlayed ? "See my result" : "Play today's word"} onPress={onPlay} style={styles.cta} />

      <CircleBoard visible refreshKey={refreshKey} />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tiles: { flexDirection: "row", gap: 6 },
  tile: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tileLetter: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  streakText: { fontSize: 14, fontWeight: "900" },
  title: { fontSize: 20, fontWeight: "900", marginTop: 14 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  cta: { marginTop: 14 },
});
