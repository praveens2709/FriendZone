import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import UserAvatar from "@/components/UserAvatar";
import CompactButton from "@/components/circle/CompactButton";
import { Suggestion } from "@/services/knockService";

const CARD_WIDTH = 168;

export default function SuggestionCarousel({
  suggestions,
  busyId,
  onProfile,
  onKnock,
}: {
  suggestions: Suggestion[];
  busyId: string | null;
  onProfile: (userId: string) => void;
  onKnock: (suggestion: Suggestion) => void;
}) {
  const { colors: theirs } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + 12}
      decelerationRate="fast"
      contentContainerStyle={styles.list}
    >
      {suggestions.map((s) => {
        const via =
          s.mutualNames.length > 0
            ? `Knows ${s.mutualNames.join(" & ")}${s.mutualCount > s.mutualNames.length ? ` +${s.mutualCount - s.mutualNames.length}` : ""}`
            : `${s.mutualCount} mutual ${s.mutualCount === 1 ? "friend" : "friends"}`;

        return (
          <View key={s.id} style={[styles.card, { backgroundColor: theirs.backgroundSecondary, borderColor: theirs.primary }]}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => onProfile(s.id)} style={styles.top}>
                <UserAvatar imageUri={s.profileImage} size={64} />
                <Text style={[styles.name, { color: theirs.text }]} numberOfLines={1}>
                  {`${s.firstName} ${s.lastName || ""}`.trim()}
                </Text>
                <Text style={[styles.via, { color: theirs.textDim }]} numberOfLines={2}>
                  {via}
                </Text>
              </TouchableOpacity>
              <View style={styles.action}>
                <CompactButton title="Knock" disabled={busyId === s.id} onPress={() => onKnock(s)} />
              </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingRight: 8 },
  card: { width: CARD_WIDTH, borderRadius: 22, borderWidth: 1.5, padding: 14, alignItems: "center" },
  top: { alignItems: "center", width: "100%" },
  name: { fontSize: 16, fontWeight: "800", marginTop: 10, textAlign: "center" },
  via: { fontSize: 12, marginTop: 3, textAlign: "center", minHeight: 30 },
  action: { width: "100%", marginTop: 10 },
});
