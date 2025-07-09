import React from "react";
import { StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import AuthScreenWrapper from "@/components/AuthScreenWrapper";
import Divider from "@/components/Divider";
import Button from "@/components/Button";
import AppLogo from "@/components/AppLogo";

export default function AuthChoiceScreen() {
  const router = useRouter();

  const handleGoogleSignIn = () => alert("Google Sign-In pressed");
  const handleAppleSignIn = () => alert("Apple Sign-In pressed");

  return (
    <AuthScreenWrapper>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.logoHeader}>
          <AppLogo
            showText
            text="Welcome to FriendZone"
            textStyle={{ fontSize: 30, fontWeight: 'bold' }}
          />
        </ThemedView>
        <ThemedView style={styles.buttonGroup}>
          <Button
            title="Login with Email"
            onPress={() => router.push("/(auth)/login")}
          />
          <Divider text="or" />
          <Button
            title="Sign Up with Email"
            onPress={() => router.push("/(auth)/signup")}
          />
        </ThemedView>

        <Divider text="or continue with" />

        <ThemedView style={styles.buttonGroup}>
          <Button title="Continue with Google" onPress={() => router.push("/(auth)/verify-otp")} />
          {Platform.OS === "ios" && (
            <Button title="Continue with Apple" onPress={handleAppleSignIn} />
          )}
        </ThemedView>
      </ThemedView>
    </AuthScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '95%',
    margin: 'auto',
    justifyContent: "center",
  },
  logoHeader: {
    marginBottom: 40,
    alignItems: "center",
  },
  buttonGroup: {
    marginVertical: 14,
  },
});
