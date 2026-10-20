import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UserAvatar from "@/components/UserAvatar";
import { Vibe } from "@/services/VibeService";
import { timeLeftLabel, vibeOption } from "@/constants/vibes";
import { readableTextOn } from "@/utils/theme-utils";
import CompactButton from "@/components/circle/CompactButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;

interface FreeNowCarouselProps {
  vibes: Vibe[];
  busyId: string | null;
  onProfile: (userId: string) => void;
  onMessage: (userId: string, name: string, avatar: string | null) => void;
  onPlan: (userId: string) => void;
}

export default function FreeNowCarousel({ vibes, busyId, onProfile, onMessage, onPlan }: FreeNowCarouselProps) {
  const { colors: theirs } = useTheme();

  const renderCard = (vibe: Vibe, isSingle: boolean) => {
    const user = vibe.user!;
    const option = vibeOption(vibe.kind);
    const name = `${user.firstName} ${user.lastName || ""}`.trim();

    return (
      <View
        key={vibe.id}
        style={[
          styles.card,
          {
            backgroundColor: theirs.backgroundSecondary,
            borderColor: theirs.primary,
            width: isSingle ? "100%" : CARD_WIDTH,
          },
        ]}
      >
        <TouchableOpacity activeOpacity={0.85} onPress={() => onProfile(user.id)} style={styles.top}>
          <UserAvatar imageUri={user.profileImage} size={46} />
          <View style={styles.names}>
            <Text style={[styles.name, { color: theirs.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.time, { color: theirs.textDim }]}>{timeLeftLabel(vibe.expiresAt)}</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.badge, { backgroundColor: theirs.primary }]}>
          <Ionicons name={option.icon} size={14} color={readableTextOn(theirs.primary, theirs.buttonText)} />
          <Text style={[styles.badgeText, { color: readableTextOn(theirs.primary, theirs.buttonText) }]}>
            {option.label}
          </Text>
        </View>

        {!!vibe.note?.trim() && (
          <Text style={[styles.note, { color: theirs.text }]} numberOfLines={2}>
            "{vibe.note.trim()}"
          </Text>
        )}

        <View style={styles.actions}>
          <CompactButton
            title="Message"
            variant="outline"
            disabled={busyId === user.id}
            onPress={() => onMessage(user.id, name, user.profileImage)}
            style={styles.action}
          />
          <CompactButton title="Make a plan" onPress={() => onPlan(user.id)} style={styles.action} />
        </View>
      </View>
    );
  };

  if (vibes.length === 1) {
    return renderCard(vibes[0], true);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + 12}
      decelerationRate="fast"
      contentContainerStyle={styles.list}
    >
      {vibes.map((vibe) => renderCard(vibe, false))}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  list: { gap: 12, paddingRight: 8 },
  card: { width: CARD_WIDTH, borderRadius: 22, borderWidth: 1.5, padding: 16 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  names: { flex: 1 },
  name: { fontSize: 17, fontWeight: "800" },
  time: { fontSize: 12, marginTop: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 12,
  },
  badgeText: { fontSize: 13, fontWeight: "800" },
  note: { fontSize: 14, fontStyle: "italic", marginTop: 8, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  action: { flex: 1 },
});
