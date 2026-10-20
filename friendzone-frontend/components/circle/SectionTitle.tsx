import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

export default function SectionTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textDim }]}>{subtitle}</Text> : null}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} hitSlop={8}>
          <Text style={[styles.action, { color: colors.primary }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  iconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 1 },
  action: { fontSize: 13, fontWeight: "700" },
});
