import React from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import ThemedModal from "@/components/ThemedModal";
import Button from "@/components/Button";

interface LogoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmationModal({
  visible,
  onClose,
  onConfirm,
}: LogoutConfirmationModalProps) {
  const { colors } = useTheme();

  return (
    <ThemedModal visible={visible} onClose={onClose}>
      <ThemedText
        type="subtitle"
        style={[styles.modalTitle, { color: colors.text }]}
      >
        Are you sure you want to log out?
      </ThemedText>
      <ThemedView style={styles.modalButtons}>
        <Button title="Cancel" onPress={onClose} style={styles.actionButton} />
        <Button
          title="Yes, Log Out"
          onPress={onConfirm}
          style={styles.actionButton}
        />
      </ThemedView>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
    marginBottom: 25,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});
