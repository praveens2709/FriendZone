import React, { useEffect, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ThemedModal from "@/components/ThemedModal";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { readableTextOn } from "@/utils/theme-utils";
import { Vibe } from "@/services/VibeService";
import VibeBackground from "@/components/VibeBackground";
import { VIBE_DURATIONS, VIBE_OPTIONS, VibeKind, nextMidnightIso } from "@/constants/vibes";

interface VibePickerModalProps {
  visible: boolean;
  current: Vibe | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: { kind: VibeKind; note: string; hours: number; endsAt?: string }) => void;
  onClear: () => void;
}

export default function VibePickerModal({
  visible,
  current,
  saving,
  onClose,
  onSave,
  onClear,
}: VibePickerModalProps) {
  const { colors } = useTheme();
  const [kind, setKind] = useState<VibeKind | null>(null);
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(6);
  const onPrimary = readableTextOn(colors.primary, colors.buttonText);

  useEffect(() => {
    if (visible) {
      setKind(current?.kind ?? null);
      setNote(current?.note ?? "");
      setHours(6);
    }
  }, [visible, current]);

  return (
    <ThemedModal visible={visible} onClose={onClose}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle" style={styles.title}>
          What's your vibe?
        </ThemedText>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <ThemedText style={[styles.subtitle, { color: colors.textDim }]}>
        Only your LockedIn circle can see this.
      </ThemedText>

      <View style={styles.grid}>
        {VIBE_OPTIONS.map((option) => {
          const selected = kind === option.kind;
          return (
            <TouchableOpacity
              key={option.kind}
              onPress={() => setKind(option.kind)}
              activeOpacity={0.85}
              style={[
                styles.tile,
                { borderColor: selected ? colors.primary : "transparent" },
              ]}
            >
              <VibeBackground kind={option.kind} watermark={56} />
              <Ionicons name={option.icon} size={18} color="#fff" />
              <ThemedText style={styles.tileLabel} numberOfLines={1}>
                {option.label}
              </ThemedText>
              {selected && (
                <View style={[styles.tileCheck, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={12} color={onPrimary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={80}
        placeholder="Add a line (optional)"
        placeholderTextColor={colors.textDim}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.buttonBackgroundSecondary,
          },
        ]}
      />

      <View style={styles.durations}>
        {VIBE_DURATIONS.map((d) => {
          const selected = hours === d.hours;
          return (
            <TouchableOpacity
              key={d.hours}
              onPress={() => setHours(d.hours)}
              style={[
                styles.duration,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.selectedItemBackground : "transparent",
                },
              ]}
            >
              <ThemedText>{d.label}</ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actions}>
        {current && (
          <Button title="Clear" variant="outline" onPress={onClear} style={styles.action} />
        )}
        <Button
          title={saving ? "Sharing..." : "Share vibe"}
          onPress={() => {
            if (!kind) return;
            const chosen = VIBE_DURATIONS.find((d) => d.hours === hours);
            onSave({
              kind,
              note: note.trim(),
              hours,
              endsAt: chosen && "untilMidnight" in chosen && chosen.untilMidnight ? nextMidnightIso() : undefined,
            });
          }}
          disabled={!kind || saving}
          style={styles.action}
        />
      </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    right: 0,
  },
  title: { textAlign: "center", marginBottom: 4 },
  subtitle: { textAlign: "center", marginBottom: 16, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tile: {
    width: "48.5%",
    height: 68,
    borderRadius: 16,
    borderWidth: 2.5,
    padding: 10,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  tileLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  tileCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 14,
  },
  durations: { flexDirection: "row", gap: 8, marginBottom: 18 },
  duration: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
  },
  actions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  action: { flex: 1 },
});
