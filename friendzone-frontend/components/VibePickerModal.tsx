import React, { useEffect, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ThemedModal from "@/components/ThemedModal";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { readableTextOn } from "@/utils/theme-utils";
import { Vibe } from "@/services/VibeService";
import { VIBE_DURATIONS, VIBE_OPTIONS, VibeKind } from "@/constants/vibes";

interface VibePickerModalProps {
  visible: boolean;
  current: Vibe | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: { kind: VibeKind; note: string; hours: number }) => void;
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
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.primary : colors.buttonBackgroundSecondary,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name={option.icon}
                size={18}
                color={selected ? onPrimary : colors.text}
              />
              <ThemedText
                style={[styles.chipLabel, { color: selected ? onPrimary : colors.text }]}
              >
                {option.label}
              </ThemedText>
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
          onPress={() => kind && onSave({ kind, note: note.trim(), hours })}
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: { fontSize: 14 },
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
