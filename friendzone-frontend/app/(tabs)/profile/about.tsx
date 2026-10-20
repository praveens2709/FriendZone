import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import ScreenBackground from "@/components/ui/ScreenBackground";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import AppLogo from "@/components/AppLogo";
import SettingsItem from "@/components/SettingsItem";
import { useTheme } from "@/context/ThemeContext";

export default function AboutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safe}>
        <CommonHeader title="About" leftContent={<BackButton color={colors.text} />} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <AppLogo size={84} />
            <Text style={[styles.name, { color: colors.text }]}>FriendZone</Text>
            <Text style={[styles.version, { color: colors.textDim }]}>Version {version}</Text>
            <Text style={[styles.tagline, { color: colors.textDim }]}>
              An app for the people you actually hang out with.
            </Text>
          </View>

          <SettingsItem card title="Terms of Service" iconName="document-text-outline" onPress={() => router.push("/legal/terms")} />
          <SettingsItem card title="Privacy Policy" iconName="shield-checkmark-outline" onPress={() => router.push("/legal/privacy")} />
          <SettingsItem card title="Help and contact" iconName="help-circle-outline" onPress={() => router.push("/profile/help")} />
        </ScrollView>
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  content: { paddingBottom: 40 },
  hero: { alignItems: "center", paddingVertical: 28, gap: 6, paddingHorizontal: 30 },
  name: { fontSize: 26, fontWeight: "900", marginTop: 10 },
  version: { fontSize: 13 },
  tagline: { fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },
});
