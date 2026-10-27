import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { suggestEmail } from "@/utils/emailSuggest";

interface EmailSuggestionProps {
  email: string;
  onApply: (email: string) => void;
}

export default function EmailSuggestion({ email, onApply }: EmailSuggestionProps) {
  const { colors } = useTheme();
  const suggestion = suggestEmail(email);
  if (!suggestion) return null;
  return (
    <TouchableOpacity onPress={() => onApply(suggestion)} style={styles.wrap}>
      <ThemedText style={[styles.text, { color: colors.textDim }]}>
        Did you mean <ThemedText style={[styles.text, { color: colors.accent, fontWeight: "700" }]}>{suggestion}</ThemedText>?
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 2 },
  text: { fontSize: 13 },
});
