import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Switch, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import ProfileServices from "@/services/ProfileService";
import BackButton from "@/components/BackButton";
import ThemedScrollView from "@/components/ThemedScrollView";

export default function AccountPrivacyScreen() {
  const [isPrivateAccount, setIsPrivateAccount] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const fetchUserPrivacyStatus = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }
    try {
      const userProfile = await ProfileServices.getProfile(accessToken);
      setIsPrivateAccount(userProfile.isPrivate);
    } catch (error) {
      console.error("Failed to fetch user privacy status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchUserPrivacyStatus();
  }, [fetchUserPrivacyStatus]);

  const handleTogglePrivateAccount = async (newValue: boolean) => {
    if (!accessToken) return;
    setIsPrivateAccount(newValue);
    try {
      const response = await ProfileServices.togglePrivacy(
        newValue,
        accessToken
      );
      console.log(
        "Success",
        `Account is now ${response.isPrivate ? "Private" : "Public"}.`
      );
    } catch (error) {
      console.error("Failed to toggle private account status:", error);
      setIsPrivateAccount(!newValue);
    }
  };

  return (
    <ScreenBackground style={{ flex: 1 }}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          title="Account privacy"
          leftContent={<BackButton color={colors.text} />}
        />
        <ThemedScrollView
          style={styles.contentContainer}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {isLoading ? (
            <ThemedView style={styles.invisibleLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </ThemedView>
          ) : (
            <ThemedView
              style={[styles.toggleRow, { borderColor: colors.border }]}
            >
              <ThemedView style={{ flex: 1, marginRight: 10 }}>
                <ThemedText style={styles.toggleLabel}>
                  Private account
                </ThemedText>
                <ThemedText
                  style={[styles.descriptionText, { color: colors.textDim }]}
                >
                  {isPrivateAccount
                    ? "When your account is private, only Locked In users (both knocked each other) can see what you share. Knockers and Knocking users must be approved before becoming Locked In."
                    : "When your account is public, your profile and posts can be seen by anyone in the app, even if they haven't knocked you."}
                </ThemedText>
              </ThemedView>
              <Switch
                onValueChange={handleTogglePrivateAccount}
                value={isPrivateAccount}
                trackColor={{ false: colors.textDim, true: colors.primary }}
                thumbColor={colors.buttonText}
                ios_backgroundColor={colors.textDim}
              />
            </ThemedView>
          )}

          <ThemedView style={styles.infoBox}>
            <ThemedText style={[styles.infoText, { color: colors.textDim }]}>
              When your account is public, anyone can knock on you and view your
              profile.{"\n\n"}
              When your account is private, only users you’ve Locked In with can
              see your posts and profile details. Knock requests will need your
              approval before they become Locked In.{"\n\n"}
              Certain basic info like your username and profile picture is
              always visible to everyone.
            </ThemedText>
          </ThemedView>
        </ThemedScrollView>
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  descriptionText: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 18,
  },
  infoBox: {
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 18,
  },
  invisibleLoadingContainer: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
});
