import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import AuthScreenWrapper from "@/components/AuthScreenWrapper";
import Button from "@/components/Button";
import AppLogo from "@/components/AppLogo";
import { useTheme } from "@/context/ThemeContext";

export default function AuthChoiceScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <AuthScreenWrapper>
      <View style={styles.container}>
        <View style={styles.logoHeader}>
          <AppLogo size={96} />
          <Text style={[styles.title, { color: colors.text }]}>Welcome to FriendZone</Text>
          <Text style={[styles.subtitle, { color: colors.textDim }]}>
            Log in or create an account to find your circle.
          </Text>
        </View>

        <View>
          <View style={styles.card}>
            <Button title="Create an account" onPress={() => router.push("/(auth)/signup")} />
            <Button title="I already have an account" variant="outline" onPress={() => router.push("/(auth)/login")} />
          </View>
          <TouchableOpacity onPress={() => router.push("/(auth)/forget-password")} style={styles.forgot}>
            <Text style={[styles.forgotText, { color: colors.textDim }]}>Forgot your password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", justifyContent: "center", gap: 28 },
  logoHeader: { alignItems: "center", gap: 6 },
  title: { fontSize: 28, fontWeight: "900", textAlign: "center", marginTop: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 280 },
  card: { gap: 6 },
  forgot: { alignItems: "center", paddingVertical: 16 },
  forgotText: { fontSize: 14, fontWeight: "600" },
});
