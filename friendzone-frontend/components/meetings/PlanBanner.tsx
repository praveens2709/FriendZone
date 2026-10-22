import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ArtBackground from "@/components/ui/ArtBackground";
import { Meeting } from "@/types/meeting.type";
import { planCountdown, planTheme } from "@/utils/planStyle";

export default function PlanBanner({ meeting }: { meeting: Meeting }) {
  const isInPerson = meeting.kind === "in_person";
  const theme = planTheme(meeting);
  const ink = "#FFFFFF";

  return (
    <View style={styles.banner}>
      <ArtBackground palette={theme.palette} glyph={theme.glyph} watermark={150} scrim />
      <View style={[styles.pill, { backgroundColor: "rgba(255,255,255,0.22)" }]}>
        <Ionicons name={isInPerson ? "location" : "videocam"} size={13} color={ink} />
        <Text style={[styles.pillText, { color: ink }]}>
          {isInPerson ? "IN PERSON" : meeting.audioOnly ? "AUDIO CALL" : "VIDEO CALL"} · {meeting.status.toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.title, { color: ink }]} numberOfLines={3}>
        {meeting.title}
      </Text>
      <Text style={[styles.countdown, { color: ink }]}>{planCountdown(meeting)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 18,
    minHeight: 150,
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  pill: {
    position: "absolute",
    top: 14,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "900" },
  countdown: { fontSize: 14, fontWeight: "700", marginTop: 4, opacity: 0.9 },
});
