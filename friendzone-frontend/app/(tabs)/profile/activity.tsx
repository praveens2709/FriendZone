import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import SettingsItem from "@/components/SettingsItem";
import ThemedScrollView from "@/components/ThemedScrollView";

interface ActivityItemProps {
  title: string;
  onPress: () => void;
  iconName: keyof typeof Ionicons.glyphMap;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  title,
  onPress,
  iconName,
}) => {
  return <SettingsItem title={title} iconName={iconName} onPress={onPress} />;
};

export default function YourActivityScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <LinearGradient colors={colors.gradient} style={{ flex: 1 }}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          title="Your activity"
          leftContent={<BackButton color={colors.text} />}
        />

        <ThemedScrollView
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <ThemedView style={styles.headerBox}>
            <ThemedText style={styles.headerTitle}>
              One place to manage your activity
            </ThemedText>
            <ThemedText
              style={[styles.headerDescription, { color: colors.textDim }]}
            >
              View and manage your interactions, content and account activity
            </ThemedText>
          </ThemedView>

          <ThemedText style={[styles.sectionTitle, { color: colors.textDim }]}>
            Interactions
          </ThemedText>
          <ActivityItem
            title="Likes"
            onPress={() => {}}
            iconName="heart-outline"
          />
          <ActivityItem
            title="Comments"
            onPress={() => {}}
            iconName="chatbubble-outline"
          />
          {/* <ActivityItem title="Reposts" onPress={() => {}} iconName="repeat-outline" />
          <ActivityItem title="Tags" onPress={() => {}} iconName="pricetag-outline" />
          <ActivityItem title="Sticker responses" onPress={() => {}} iconName="happy-outline" />
          <ActivityItem title="Reviews" onPress={() => {}} iconName="star-outline" /> */}

          <ThemedText style={[styles.sectionTitle, { color: colors.textDim }]}>
            Removed and archived content
          </ThemedText>
          <ActivityItem
            title="Recently Deleted"
            onPress={() => {}}
            iconName="trash-outline"
          />
          <ActivityItem
            title="Archived"
            onPress={() => {}}
            iconName="archive-outline"
          />
        </ThemedScrollView>
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  headerBox: {
    marginTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 26,
    textAlign: "center",
  },
  headerDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 5,
    textTransform: "uppercase",
  },
});
