import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { vibeOption } from "@/constants/vibes";

export default function VibeTag({
  kind,
  note,
  compact = false,
}: {
  kind: string;
  note?: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const option = vibeOption(kind);

  return (
    <View style={[styles.tag, { backgroundColor: colors.primary + "1F" }]}>
      <Ionicons name={option.icon} size={compact ? 11 : 13} color={colors.primary} />
      <Text
        numberOfLines={1}
        style={[styles.text, { color: colors.text, fontSize: compact ? 11 : 12 }]}
      >
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
  text: { fontWeight: "700", flexShrink: 1 },
});
