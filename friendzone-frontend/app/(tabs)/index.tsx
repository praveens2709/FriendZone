import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";

export default function HomeScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/AuthChoice" />;

  return (
    <>
      <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
        <ThemedView style={styles.contentContainer}>
          <ThemedText style={[styles.text, { color: colors.text }]}>
            Welcome Home!
          </ThemedText>
          <ThemedText style={[styles.subText, { color: colors.textDim }]}>
            This is your main dashboard.
          </ThemedText>
        </ThemedView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    lineHeight: 30
  },
  subText: {
    fontSize: 16,
    textAlign: "center",
  },
});
