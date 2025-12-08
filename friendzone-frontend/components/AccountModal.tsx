import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedModal from "@/components/ThemedModal";
import SettingsItem from "@/components/SettingsItem";
import ThemedScrollView from "./ThemedScrollView";
import ProfileServices from "@/services/ProfileService";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/types/user.type";
import { formatDateOfBirth } from "@/constants/Functions";
import ChangePasswordModal from "./modals/ChangePasswordModal";
import ContactInfoModal from "./modals/ContactInfoModal";
import DateOfBirthModal from "./modals/DateOfBirthModal";
import ForgotPasswordModal from "./modals/ForgotPasswordModal";
import ResetPasswordModal from "./modals/ResetPasswordModal";

interface AccountCentreModalProps {
  visible: boolean;
  onClose: () => void;
}

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
};

export default function AccountCentreModal({
  visible,
  onClose,
}: AccountCentreModalProps) {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);
  const [showDateOfBirthModal, setShowDateOfBirthModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  const fetchUserProfile = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    try {
      const userProfile = await ProfileServices.getProfile(accessToken);
      setUser(userProfile);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  }, [accessToken]);

  useEffect(() => {
    if (visible) {
      fetchUserProfile();
      setShowPasswordModal(false);
      setShowContactInfoModal(false);
      setShowDateOfBirthModal(false);
      setShowForgotPasswordModal(false);
      setShowResetPasswordModal(false);
    }
  }, [visible, fetchUserProfile]);

  const handleClosePasswordModal = () => setShowPasswordModal(false);
  const handleCloseContactInfoModal = () => setShowContactInfoModal(false);
  const handleCloseDateOfBirthModal = () => setShowDateOfBirthModal(false);
  const handleCloseForgotPasswordModal = () => setShowForgotPasswordModal(false);
  const handleCloseResetPasswordModal = () => setShowResetPasswordModal(false);

  const handleCloseAll = () => {
    setShowPasswordModal(false);
    setShowContactInfoModal(false);
    setShowDateOfBirthModal(false);
    setShowForgotPasswordModal(false);
    setShowResetPasswordModal(false);
    onClose();
  };
  
  const handleForgotPassword = () => {
    setShowPasswordModal(false);
    setShowForgotPasswordModal(true);
  };
  
  const handleOnResetPassword = (email: string) => {
    setForgotPasswordEmail(email);
    setShowForgotPasswordModal(false);
    setShowResetPasswordModal(true);
  };

  return (
    <>
      <ThemedModal
        visible={
          visible &&
          !showContactInfoModal &&
          !showDateOfBirthModal &&
          !showPasswordModal &&
          !showForgotPasswordModal &&
          !showResetPasswordModal
        }
        onClose={onClose}
        containerStyle={styles.modalContainer}
        fullHeight={false}
      >
        <ThemedView style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Accounts Centre
          </ThemedText>
          <View style={styles.placeholderView} />
        </ThemedView>

        <ThemedScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={[styles.description, { color: colors.textDim }]}>
            Manage your personal information and security settings here. Keep
            your account safe by updating your details and changing your
            password.
          </ThemedText>

          <ThemedText style={[styles.sectionTitle, { color: colors.textDim }]}>
            Password and security
          </ThemedText>
          <ThemedView style={[styles.itemWrapper, {borderColor: colors.border}]}>
            <SettingsItem
              title="Change password"
              iconName="shield-outline"
              onPress={() => setShowPasswordModal(true)}
            />
          </ThemedView>

          <ThemedText style={[styles.sectionTitle, { color: colors.textDim }]}>
            Personal details
          </ThemedText>
          <ThemedView style={[styles.itemWrapper, {borderColor: colors.border}]}>
            <SettingsItem
              title="Contact info"
              subTitle={`${user?.email || "Not set"}, ${
                user?.phone || "Not set"
              }`}
              onPress={() => setShowContactInfoModal(true)}
            />
            <Divider />
            <SettingsItem
              title="Date of birth"
              subTitle={formatDateOfBirth(user?.dob)}
              onPress={() => setShowDateOfBirthModal(true)}
            />
          </ThemedView>
        </ThemedScrollView>
      </ThemedModal>

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={handleClosePasswordModal}
        onCloseAll={handleCloseAll}
        onForgotPassword={handleForgotPassword}
      />
      <ContactInfoModal
        visible={showContactInfoModal}
        onClose={handleCloseContactInfoModal}
        user={user}
      />
      <DateOfBirthModal
        visible={showDateOfBirthModal}
        onClose={handleCloseDateOfBirthModal}
        dob={user?.dob}
      />
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={handleCloseForgotPasswordModal}
        onResetPassword={handleOnResetPassword}
      />
      <ResetPasswordModal
        visible={showResetPasswordModal}
        onClose={handleCloseResetPasswordModal}
        onCloseAll={handleCloseAll}
        email={forgotPasswordEmail}
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
    marginBottom: 16,
  },
  closeButton: {
    padding: 8,
    margin: -8,
  },
  placeholderView: {
    width: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  itemWrapper: {
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  divider: {
    height: 1,
  },
});