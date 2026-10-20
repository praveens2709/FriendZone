import React from "react";
import { StyleProp, StyleSheet, TextStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";

interface InlineErrorProps {
  message?: string | null;
  style?: StyleProp<TextStyle>;
}

export default function InlineError({ message, style }: InlineErrorProps) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <ThemedText style={[styles.text, { color: colors.error }, style]}>
      {message}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    textAlign: "center",
  },
});
