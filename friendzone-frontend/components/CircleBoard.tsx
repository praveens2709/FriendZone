import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import UserAvatar from "@/components/UserAvatar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import WordleService, { CircleBoardRow } from "@/services/WordleService";

export default function CircleBoard({ visible, refreshKey = 0 }: { visible: boolean; refreshKey?: number }) {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<CircleBoardRow[]>([]);

  useEffect(() => {
    if (!visible || !accessToken) return;
    WordleService.getCircleBoard(accessToken)
      .then(setRows)
      .catch(() => setRows([]));
  }, [visible, accessToken, refreshKey]);

  if (rows.length < 2) return null;

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.heading, { color: colors.textDim }]}>YOUR CIRCLE TODAY</ThemedText>
      {rows.map((row, index) => {
        const theirs = colors;
        return (
          <View
            key={row.userId}
            style={[
              styles.row,
              { backgroundColor: theirs.backgroundSecondary, borderColor: theirs.primary },
            ]}
          >
            <Text style={[styles.rank, { color: theirs.textDim }]}>{index + 1}</Text>
            <UserAvatar imageUri={row.profileImage} size={30} />
            <Text numberOfLines={1} style={[styles.name, { color: theirs.text }]}>
              {row.isMe ? "You" : row.firstName}
            </Text>
            <View style={styles.status}>
              {row.playedToday ? (
                <Text style={[styles.statusText, { color: theirs.textDim }]}>
                  {row.wonToday ? `${row.attemptsToday}/6` : "X/6"}
                </Text>
              ) : (
                <Text style={[styles.statusText, { color: theirs.textDim }]}>not yet</Text>
              )}
              <Ionicons name="flame" size={16} color={theirs.primary} />
              <Text style={[styles.streak, { color: theirs.text }]}>{row.currentStreak}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: "stretch", marginTop: 18, gap: 8 },
  heading: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  rank: { width: 16, fontWeight: "700" },
  name: { flex: 1, fontSize: 15, fontWeight: "600" },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 13 },
  streak: { fontWeight: "700" },
});
