import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vibeOption } from "@/constants/vibes";
import { vibePalette } from "@/components/VibeBackground";

export default function VibeTag({
  kind,
  note,
  compact = false,
}: {
  kind: string;
  note?: string;
  compact?: boolean;
}) {
  const option = vibeOption(kind);

  return (
    <View style={[styles.tag, { backgroundColor: vibePalette(option.kind)[1] }]}>
      <Ionicons name={option.icon} size={compact ? 11 : 13} color="#fff" />
      <Text numberOfLines={1} style={[styles.text, { fontSize: compact ? 11 : 12 }]}>
        {option.label}
        {!compact && note ? ` · ${note}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: { color: "#fff", fontWeight: "700", flexShrink: 1 },
});
