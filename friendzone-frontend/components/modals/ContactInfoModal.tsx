import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedModal from "@/components/ThemedModal";
import SettingsItem from "@/components/SettingsItem";
import { User } from "@/types/user.type";
import EmailModal from "./EmailModal";
import PhoneModal from "./PhoneModal";

interface ContactInfoModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
}

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
};

export default function ContactInfoModal({
  visible,
  onClose,
  user,
}: ContactInfoModalProps) {
  const { colors } = useTheme();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const handleCloseEmailModal = () => setShowEmailModal(false);
  const handleClosePhoneModal = () => setShowPhoneModal(false);

  return (
    <>
      <ThemedModal
        visible={visible && !showEmailModal && !showPhoneModal}
        onClose={onClose}
        containerStyle={styles.modalContainer}
      >
        <ThemedView style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Contact information
          </ThemedText>
          <View style={styles.placeholderView} />
        </ThemedView>
        <ThemedView style={styles.infoBox}>
          <ThemedText style={[styles.infoText, { color: colors.textDim }]}>
            Manage your mobile numbers and email addresses to make sure that
            your contact info is accurate and up to date.
          </ThemedText>
        </ThemedView>
        <ThemedView style={[styles.itemWrapper, { borderColor: colors.border }]}>
          <SettingsItem
            title={user?.email || "Not set"}
            iconName="email-outline"
            onPress={() => setShowEmailModal(true)}
          />
          <Divider />
          <SettingsItem
            title={user?.phone || "Not set"}
            iconName="phone-portrait-outline"
            onPress={() => setShowPhoneModal(true)}
          />
        </ThemedView>
      </ThemedModal>
      <EmailModal
        visible={showEmailModal}
        onClose={handleCloseEmailModal}
        email={user?.email}
      />
      <PhoneModal
        visible={showPhoneModal}
        onClose={handleClosePhoneModal}
        phone={user?.phone}
      />
    </>
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
  infoBox: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
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