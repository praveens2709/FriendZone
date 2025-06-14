import React, { useEffect } from "react";
import { StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { ThemedText } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { ThemeType } from "@/store/themeStore";
import { useTheme } from "@/context/ThemeContext";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";

interface IndexScreenProps {
  theme?: ThemeType;
}

export default function IndexScreen({ theme }: IndexScreenProps) {
  const { colors, setTheme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) return null;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  useEffect(() => {
    if (theme) {
      setTheme(theme);
    }
    console.log("welcome theme", theme);
  }, [theme, setTheme]);

  return (
    <>
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.header}>
            <ThemedText
              type="title"
              style={[styles.title, { color: colors.text }]}
            >
              FriendZone
            </ThemedText>
            <ThemedText
              type="default"
              style={[styles.tagline, { color: colors.text }]}
            >
              Where friends chat, vibe & play
            </ThemedText>
          </ThemedView>

          <LottieView
            source={require("../assets/animations/welcome.json")}
            autoPlay
            loop
            style={styles.animation}
          />

          <ThemedView style={styles.joinButton}>
            <Button
              title="Join the Zone"
              onPress={() => router.push("/(auth)/AuthChoice")}
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
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
  },
  tagline: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  animation: {
    width: 300,
    height: 300,
  },
  joinButton: {
    width: "65%",
  },
});
