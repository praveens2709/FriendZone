import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenBackground from "@/components/ui/ScreenBackground";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import { useTheme } from "@/context/ThemeContext";
import { LEGAL_UPDATED, LegalSection } from "@/constants/legal";

export default function LegalDocument({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: string;
  sections: LegalSection[];
}) {
  const { colors } = useTheme();

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safe}>
        <CommonHeader title={title} leftContent={<BackButton color={colors.text} />} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.updated, { color: colors.textDim }]}>Last updated {LEGAL_UPDATED}</Text>
          {intro ? <Text style={[styles.intro, { color: colors.text }]}>{intro}</Text> : null}
          {sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
              <Text style={[styles.body, { color: colors.textDim }]}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: 22, paddingBottom: 48 },
  updated: { fontSize: 12, marginTop: 6, marginBottom: 14 },
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 18 },
  section: { marginBottom: 20 },
  heading: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21 },
});
