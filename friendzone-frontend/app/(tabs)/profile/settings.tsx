import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, StatusBar, Switch, View, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import Button from '@/components/Button';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import CommonHeader from '@/components/CommonHeader';
import ThemedSafeArea from '@/components/ThemedSafeArea';
import BackButton from '@/components/BackButton';
import ProfileServices from '@/services/ProfileService';
import { ThemedText } from '@/components/ThemedText';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut, accessToken, user } = useAuth();
  const [isPrivateAccount, setIsPrivateAccount] = useState<boolean>(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);
  const fetchUserPrivacyStatus = useCallback(async () => {
    if (!accessToken) {
      setLoadingPrivacy(false);
      return;
    }
    setLoadingPrivacy(true);
    try {
      const userProfile = await ProfileServices.getProfile(accessToken);
      setIsPrivateAccount(userProfile.isPrivate);
    } catch (error) {
      console.error("Failed to fetch user privacy status:", error);
      Alert.alert("Error", "Could not load privacy settings.");
    } finally {
      setLoadingPrivacy(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchUserPrivacyStatus();
  }, [fetchUserPrivacyStatus]);

  const handleTogglePrivateAccount = async (newValue: boolean) => {
    if (!accessToken) return;
    setIsPrivateAccount(newValue);
    try {
      const response = await ProfileServices.togglePrivacy(newValue, accessToken);
      Alert.alert("Success", `Account is now ${response.isPrivate ? 'Private' : 'Public'}.`);
    } catch (error) {
      console.error("Failed to toggle private account status:", error);
      setIsPrivateAccount(!newValue);
      Alert.alert("Error", "Failed to update privacy settings.");
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/AuthChoice');
    console.log('[auth.signOut] Removing session');
  };

  return (
    <>
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <ThemedSafeArea style={styles.safeAreaTransparentBg}>
          <CommonHeader title="Settings" leftContent={<BackButton/>}/>

          <ThemedView style={styles.settingsList}>
            <Button
              title="Change Theme"
              onPress={() => router.push('/profile/change-theme')}
              variant="setting-item"
              iconName="color-palette-outline"
            />

            <Button
              title="Activity"
              onPress={() => { /* navigate to Activity screen */ }}
              variant="setting-item"
              iconName="time-outline"
            />

            {/* Privacy Section with Toggle */}
            {loadingPrivacy ? (
              <ThemedView style={styles.loadingPrivacyContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <ThemedText style={{ color: colors.textDim, marginLeft: 10 }}>Loading privacy...</ThemedText>
              </ThemedView>
            ) : (
              <ThemedView style={[styles.settingItem, {backgroundColor: 'transparent'}]}>
                <ThemedView style={styles.settingTextContainer}>
                  <ThemedText style={styles.settingText}>Private Account</ThemedText>
                  <ThemedText style={[styles.settingDescription, {color: colors.textDim}]}>
                    {isPrivateAccount
                      ? "Knock requests require your approval."
                      : "Anyone can knock you directly without approval."
                    }
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

            <Button
              title="Log Out"
              onPress={handleLogout}
              style={styles.logoutButton}
              textStyle={styles.logoutButtonText}
            />
          </ThemedView>
        </ThemedSafeArea>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeAreaTransparentBg: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
    backgroundColor: "transparent"
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 15,
    marginVertical: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  settingText: {
    fontSize: 18,
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingPrivacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoutButton: {
    marginTop: 30,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});