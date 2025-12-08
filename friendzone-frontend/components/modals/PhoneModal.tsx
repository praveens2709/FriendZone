import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedModal from "@/components/ThemedModal";
import SettingsItem from "@/components/SettingsItem";
import Button from "@/components/Button";

interface PhoneModalProps {
  visible: boolean;
  onClose: () => void;
  phone: string | undefined;
}

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
};

export default function PhoneModal({
  visible,
  onClose,
  phone,
}: PhoneModalProps) {
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
        <View style={styles.placeholderView} />
      </ThemedView>

      <ThemedText style={[styles.phoneTitle, { color: colors.text }]}>
        {phone || "No phone number"}
      </ThemedText>
      <ThemedText style={[styles.description, { color: colors.textDim }]}>
        {phone ? (
          <ThemedText style={[styles.description, { color: colors.textDim }]}>
            You added this number to this account.
            <ThemedText style={[styles.linkText, { color: colors.primary }]}>
              {" "}
              Learn more about how we use your number.
            </ThemedText>
          </ThemedText>
        ) : (
          "Add a number to receive important account notifications."
        )}
      </ThemedText>

      {phone ? (
        <ThemedView
          style={[styles.itemWrapper, { borderColor: colors.border }]}
        >
          <SettingsItem
            title="Delete mobile number"
            onPress={() => console.log("Delete phone number")}
            textStyle={{ color: colors.error }}
          />
        </ThemedView>
      ) : (
        <ThemedView
          style={[styles.itemWrapper, { borderColor: colors.border }]}
        >
          <SettingsItem
            title="Add new number"
            onPress={() => console.log("Add new number")}
            textStyle={{ color: colors.text }}
          />
        </ThemedView>
      )}
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
  placeholderView: {
    width: 24,
  },
  phoneTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  itemWrapper: {
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  divider: {
    height: 1,
  },
});
