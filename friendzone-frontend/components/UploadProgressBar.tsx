import React from "react";
import { StyleSheet, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { useUploadStore } from "@/store/uploadStore";

export default function UploadProgressBar() {
  const { colors } = useTheme();
  const status = useUploadStore((s) => s.status);
  const progress = useUploadStore((s) => s.progress);
  const thumbUri = useUploadStore((s) => s.thumbUri);
  const retry = useUploadStore((s) => s.retry);
  const dismiss = useUploadStore((s) => s.dismiss);

  if (status === "idle") return null;

  const failed = status === "error";
  const finished = status === "done";
  const label = failed
    ? "Couldn't post"
    : finished
    ? "Posted"
    : status === "processing"
    ? "Finishing up..."
    : "Posting...";
  const ratio = finished || status === "processing" ? 1 : progress;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.border }]} />
        )}
        <ThemedText style={[styles.label, failed && { color: colors.error }]} numberOfLines={1}>
          {label}
        </ThemedText>
        {failed ? (
          <View style={styles.actions}>
            <TouchableOpacity onPress={retry} hitSlop={8}>
              <ThemedText style={[styles.action, { color: colors.accent }]}>Retry</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismiss} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
        ) : finished ? (
          <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
        ) : status === "processing" ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <ThemedText style={[styles.percent, { color: colors.textDim }]}>
            {Math.round(progress * 100)}%
          </ThemedText>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(failed ? 0 : 4, ratio * 100)}%`,
              backgroundColor: failed ? colors.error : colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
  thumb: { width: 38, height: 38, borderRadius: 8 },
  label: { flex: 1, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  percent: { fontSize: 13, fontWeight: "600", minWidth: 36, textAlign: "right" },
  actions: { flexDirection: "row", alignItems: "center", gap: 14 },
  action: { fontSize: 15, fontWeight: "700" },
  track: { height: 3, width: "100%" },
  fill: { height: "100%" },
});
