import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import Button from "@/components/Button";
import ArtBackground from "@/components/ui/ArtBackground";
import { ART } from "@/constants/artPalettes";

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  art = "hangout",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  art?: keyof typeof ART;
}) {
  const { colors } = useTheme();
  const theme = ART[art] ?? ART.hangout;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <ArtBackground palette={theme.palette} glyph={icon} watermark={104} />
        <Ionicons name={icon} size={38} color="#fff" />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {!!message && <Text style={[styles.message, { color: colors.textDim }]}>{message}</Text>}
      {!!actionLabel && !!onAction && (
        <Button title={actionLabel} onPress={onAction} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 36 },
  card: {
    width: 136,
    height: 104,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 19, fontWeight: "800", marginTop: 18, textAlign: "center" },
  message: { fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: "center" },
  button: { marginTop: 18, width: 200 },
});
