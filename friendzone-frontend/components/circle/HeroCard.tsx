import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UserAvatar from "@/components/UserAvatar";
import { useTheme } from "@/context/ThemeContext";
import { readableTextOn } from "@/utils/theme-utils";

interface HeroCardProps {
  name: string;
  friends: { id: string; avatar: string | null }[];
  friendCount: number;
  freeCount: number;
  planCount: number;
  streak: number;
}

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function HeroCard({ name, friends, friendCount, freeCount, planCount, streak }: HeroCardProps) {
  const { colors } = useTheme();
  const ink = readableTextOn(colors.primary, colors.buttonText);
  const chipBg = ink === "#FFFFFF" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
  const orb = ink === "#FFFFFF" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";

  const summary =
    friendCount === 0
      ? "Knock on someone to start your circle."
      : freeCount > 0
        ? `${freeCount} of your ${friendCount} ${freeCount === 1 ? "is" : "are"} free right now.`
        : `${friendCount} locked in. Nobody's free yet.`;

  return (
    <View style={[styles.card, { backgroundColor: colors.primary }]}>
      <View style={[styles.orbLarge, { backgroundColor: orb }]} />
      <View style={[styles.orbSmall, { backgroundColor: orb }]} />

      <Text style={[styles.greeting, { color: ink }]}>{greeting()},</Text>
      <Text style={[styles.name, { color: ink }]} numberOfLines={1}>
        {name || "friend"}
      </Text>
      <Text style={[styles.summary, { color: ink }]}>{summary}</Text>

      {friends.length > 0 && (
        <View style={styles.avatars}>
          {friends.slice(0, 6).map((friend, index) => (
            <View
              key={friend.id}
              style={[styles.avatarRing, { borderColor: colors.primary, marginLeft: index === 0 ? 0 : -12 }]}
            >
              <UserAvatar imageUri={friend.avatar} size={34} />
            </View>
          ))}
          {friendCount > 6 && (
            <View style={[styles.more, { backgroundColor: chipBg, marginLeft: -12 }]}>
              <Text style={[styles.moreText, { color: ink }]}>+{friendCount - 6}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.chips}>
        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <Ionicons name="moon-outline" size={14} color={ink} />
          <Text style={[styles.chipText, { color: ink }]}>{freeCount} free</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <Ionicons name="calendar-outline" size={14} color={ink} />
          <Text style={[styles.chipText, { color: ink }]}>
            {planCount} {planCount === 1 ? "plan" : "plans"}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <Ionicons name="flame-outline" size={14} color={ink} />
          <Text style={[styles.chipText, { color: ink }]}>{streak}-day streak</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 20, marginBottom: 22, overflow: "hidden" },
  orbLarge: { position: "absolute", width: 220, height: 220, borderRadius: 110, right: -60, top: -70 },
  orbSmall: { position: "absolute", width: 110, height: 110, borderRadius: 55, right: 40, bottom: -50 },
  greeting: { fontSize: 14, fontWeight: "600", opacity: 0.85 },
  name: { fontSize: 30, fontWeight: "900", lineHeight: 36, marginTop: 2 },
  summary: { fontSize: 14, marginTop: 6, opacity: 0.9, lineHeight: 20 },
  avatars: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  avatarRing: { borderWidth: 2.5, borderRadius: 24 },
  more: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  moreText: { fontSize: 12, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: "700" },
});
