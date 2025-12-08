import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedModal from "@/components/ThemedModal";
import { formatDateOfBirth } from "@/constants/Functions";

interface DateOfBirthModalProps {
  visible: boolean;
  onClose: () => void;
  dob: Date | string | undefined;
}

export default function DateOfBirthModal({
  visible,
  onClose,
  dob,
}: DateOfBirthModalProps) {
  const { colors } = useTheme();

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      containerStyle={styles.modalContainer}
    >
      <ThemedView style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.title, { color: colors.text }]}>
          Date of birth
        </ThemedText>
        <View style={styles.placeholderView} />
      </ThemedView>
      <ThemedText style={[styles.description, { color: colors.textDim }]}>
        Providing your date of birth helps make sure that you get the right
        experience for your age.
      </ThemedText>
      <ThemedView style={styles.warningBox}>
        <ThemedText style={[styles.warningText, { color: colors.textDim }]}>
          There is a limit to how many times you can change your date of birth.
          Please contact us in order to request a date of birth change.
          <ThemedText style={[styles.linkText, { color: colors.primary }]}>
            {" "}
            Contact us
          </ThemedText>
        </ThemedText>
      </ThemedView>
      <ThemedView
        style={[
          styles.dobBox,
          { backgroundColor: colors.buttonBackgroundSecondary },
        ]}
      >
        <ThemedText style={[styles.dobText, { color: colors.text }]}>
          {formatDateOfBirth(dob)}
        </ThemedText>
      </ThemedView>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholderView: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  warningBox: {
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  dobBox: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  dobText: {
    fontSize: 16,
  },
});
