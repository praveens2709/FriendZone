import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import Button from '@/components/Button';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import CommonHeader from '@/components/CommonHeader';
import { ThemedView } from '@/components/ThemedView';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/AuthChoice');
    console.log('[auth.signOut] Removing session');
  };

  return (
    <>
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <CommonHeader pageTitle="Settings" />

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

            <Button
              title="Privacy"
              onPress={() => { /* navigate to Privacy screen */ }}
              variant="setting-item"
              iconName="lock-closed-outline"
            />

            <Button
              title="Notifications"
              onPress={() => { /* navigate to Notifications screen */ }}
              variant="setting-item"
              iconName="notifications-outline"
            />

            <Button
              title="Log Out"
              onPress={handleLogout}
              style={styles.logoutButton}
              textStyle={styles.logoutButtonText}
            />
          </ThemedView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
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
  },
  settingText: {
    fontSize: 18,
  },
  logoutButton: {
    marginTop: 30,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});