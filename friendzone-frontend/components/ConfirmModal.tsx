import React from "react";
import { StyleSheet } from "react-native";
import ThemedModal from "@/components/ThemedModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useTheme();
  return (
    <ThemedModal visible={visible} onClose={onCancel}>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {!!message && (
        <ThemedText style={[styles.message, { color: colors.textDim }]}>{message}</ThemedText>
      )}
      <ThemedView style={styles.buttons}>
        <Button title={cancelLabel} onPress={onCancel} style={styles.button} />
        <Button title={confirmLabel} onPress={onConfirm} style={styles.button} />
      </ThemedView>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "center", marginBottom: 10 },
  message: { textAlign: "center", marginBottom: 20, lineHeight: 20 },
  buttons: { flexDirection: "row", gap: 12, marginBottom: 8 },
  button: { flex: 1 },
});
