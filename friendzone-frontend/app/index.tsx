import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemeType } from "@/store/themeStore";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Card from "@/components/ui/Card";
import AppLogo from "@/components/AppLogo";
import Button from "@/components/Button";
import ThemedSafeArea from "@/components/ThemedSafeArea";

interface IndexScreenProps {
  theme?: ThemeType;
}

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: "lock-closed-outline", title: "Lock in your circle", text: "Knock, get knocked back, and keep your people close. No follower counts." },
  { icon: "moon-outline", title: "See who's free", text: "Share your vibe for the day and spot friends who are up for something." },
  { icon: "calendar-outline", title: "Turn plans into real life", text: "Invite friends to a hangout in two taps and see who's in." },
];

export default function IndexScreen({ theme }: IndexScreenProps) {
  const { colors, setTheme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();

  useEffect(() => {
    if (theme) setTheme(theme);
  }, [theme, setTheme]);

  if (authLoading) return null;
  if (isAuthenticated) return <Redirect href="/home" />;

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.top}>
            <AppLogo size={72} />
            <Text style={[styles.headline, { color: colors.text }]}>
              Your people.{"\n"}Your plans.{"\n"}
              <Text style={{ color: colors.primary }}>Your zone.</Text>
            </Text>
            <Text style={[styles.tagline, { color: colors.textDim }]}>
              FriendZone is for the people you actually hang out with.
            </Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <Card key={feature.title} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + "1F" }]}>
                  <Ionicons name={feature.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                  <Text style={[styles.featureBody, { color: colors.textDim }]}>{feature.text}</Text>
                </View>
              </Card>
            ))}
          </View>

          <View style={styles.cta}>
            <Button title="Join the Zone" onPress={() => router.push("/(auth)/AuthChoice")} />
            <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={styles.signIn}>
              <Text style={[styles.signInText, { color: colors.textDim }]}>
                Already in? <Text style={{ color: colors.text, fontWeight: "800" }}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  content: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 24, paddingBottom: 12, gap: 22 },
  top: { alignItems: "flex-start", gap: 14 },
  headline: { fontSize: 40, fontWeight: "900", lineHeight: 46, letterSpacing: -0.5 },
  tagline: { fontSize: 15, lineHeight: 22, maxWidth: 300 },
  features: { gap: 10 },
  feature: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: "800" },
  featureBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  cta: { alignItems: "center" },
  signIn: { paddingVertical: 12 },
  signInText: { fontSize: 14 },
});
