import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenBackground from "@/components/ui/ScreenBackground";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import AuthServices from "@/services/AuthService";
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from "@/constants/legal";

export default function TermsGate() {
  const { colors } = useTheme();
  const { isAuthenticated, user, fetchProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<"terms" | "privacy" | null>(null);

  const needsAcceptance = isAuthenticated && !!user && user.termsAccepted === false;

  const accept = async () => {
    try {
      setSaving(true);
      await AuthServices.acceptTerms();
      await fetchProfile();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={needsAcceptance} animationType="slide">
      <ScreenBackground>
        <ThemedSafeArea style={styles.safe}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>One quick thing</Text>
            <Text style={[styles.body, { color: colors.textDim }]}>
              We've added Terms of Service and a Privacy Policy to FriendZone. Please review them and
              agree to keep using the app.
            </Text>
            <Text style={[styles.body, { color: colors.textDim }]}>
              By continuing you confirm you're 18 or older.
            </Text>

            <View style={styles.links}>
              <TouchableOpacity onPress={() => setOpen(open === "terms" ? null : "terms")}>
                <Text style={[styles.link, { color: colors.primary }]}>
                  {open === "terms" ? "Hide" : "Read"} the Terms of Service
                </Text>
              </TouchableOpacity>
              {open === "terms" &&
                TERMS_SECTIONS.map((section) => (
                  <View key={section.heading} style={styles.section}>
                    <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
                    <Text style={[styles.sectionBody, { color: colors.textDim }]}>{section.body}</Text>
                  </View>
                ))}

              <TouchableOpacity onPress={() => setOpen(open === "privacy" ? null : "privacy")}>
                <Text style={[styles.link, { color: colors.primary }]}>
                  {open === "privacy" ? "Hide" : "Read"} the Privacy Policy
                </Text>
              </TouchableOpacity>
              {open === "privacy" &&
                PRIVACY_SECTIONS.map((section) => (
                  <View key={section.heading} style={styles.section}>
                    <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
                    <Text style={[styles.sectionBody, { color: colors.textDim }]}>{section.body}</Text>
                  </View>
                ))}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button title={saving ? "Saving..." : "I agree, continue"} onPress={accept} disabled={saving} />
          </View>
        </ThemedSafeArea>
      </ScreenBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 24, paddingTop: 48, gap: 14 },
  title: { fontSize: 30, fontWeight: "900" },
  body: { fontSize: 16, lineHeight: 24 },
  links: { gap: 14, marginTop: 10 },
  link: { fontSize: 16, fontWeight: "800", textDecorationLine: "underline" },
  section: { gap: 4 },
  heading: { fontSize: 15, fontWeight: "800" },
  sectionBody: { fontSize: 14, lineHeight: 21 },
  footer: { padding: 24 },
});
