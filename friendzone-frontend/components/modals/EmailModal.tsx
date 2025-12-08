import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedModal from "@/components/ThemedModal";
import SettingsItem from "@/components/SettingsItem";

interface EmailModalProps {
  visible: boolean;
  onClose: () => void;
  email: string | undefined;
}

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
};

export default function EmailModal({
  visible,
  onClose,
  email,
}: EmailModalProps) {
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

      <ThemedText style={[styles.emailTitle, { color: colors.text }]}>
        {email || "No email"}
      </ThemedText>
      <ThemedText style={[styles.description, { color: colors.textDim }]}>
        You added this email address to these accounts.
        <ThemedText style={[styles.linkText, { color: colors.primary }]}>
          {" "}
          Learn more about how we use your email address.
        </ThemedText>
      </ThemedText>

      <ThemedView style={[styles.itemWrapper, {borderColor: colors.border}]}>
        <SettingsItem
          title="Confirm email address"
          onPress={() => console.log("Confirm email")}
        />
        <Divider />
        <SettingsItem
          title="Delete email address"
          onPress={() => console.log("Delete email")}
          textStyle={{ color: colors.error }}
        />
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
  placeholderView: {
    width: 24,
  },
  emailTitle: {
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
  connectedAccounts: {
    marginBottom: 20,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
  },
  accountInfo: {
    fontSize: 14,
  },
  itemWrapper: {
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
});