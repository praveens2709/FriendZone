import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import ProfileServices from "@/services/ProfileService";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import SettingsItem from "@/components/SettingsItem";
import { useAuth } from "@/context/AuthContext";
import { SectionType } from "@/types/settings.type";
import BackButton from "@/components/BackButton";
import ThemedScrollView from "@/components/ThemedScrollView";
import AccountCentreModal from "@/components/AccountModal";
import LogoutConfirmationModal from "@/components/modals/LogoutModal";

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signOut, user } = useAuth();
  const [closeFriendCount, setCloseFriendCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      ProfileServices.getCloseFriends()
        .then((list) => setCloseFriendCount(list.filter((f) => f.isClose).length))
        .catch(() => setCloseFriendCount(null));
    }, [])
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [showAccountCentre, setShowAccountCentre] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/AuthChoice");
  };

  const sections: SectionType[] = useMemo(
    () => [
      {
        title: "Your account",
        data: [
          {
            title: "Accounts Centre",
            subTitle: "Password, security, personal details",
            onPress: () => setShowAccountCentre(true),
          },
        ],
      },
      {
        title: "How you use the app",
        data: [
          {
            title: "Saved",
            iconName: "bookmark-outline",
            onPress: () => router.push("/profile/saved"),
          },
          {
            title: "Archive",
            iconName: "archive-outline",
            onPress: () => router.push("/profile/archive"),
          },
          {
            title: "Your activity",
            iconName: "time-outline",
            onPress: () => router.push("/profile/activity"),
          },
        ],
      },
      {
        title: "Appearance & Preferences",
        data: [
          {
            title: "Change Theme",
            iconName: "color-palette-outline",
            onPress: () => router.push("/profile/change-theme"),
          },
        ],
      },
      {
        title: "Who can see your content",
        data: [
          {
            title: "Account privacy",
            subTitle: user?.isPrivate ? "Private" : "Public",
            iconName: "lock-closed-outline",
            onPress: () => router.push("/profile/privacy"),
          },
          {
            title: "Close Friends",
            subTitle: closeFriendCount === null ? undefined : String(closeFriendCount),
            iconName: "star-outline",
            onPress: () => router.push("/profile/close-friends"),
          },
        ],
      },
      {
        title: "Safety",
        data: [
          {
            title: "Blocked accounts",
            iconName: "ban-outline",
            onPress: () => router.push("/profile/blocked"),
          },
          {
            title: "Delete account",
            subTitle: "Permanently remove your account and data",
            iconName: "trash-outline",
            onPress: () => router.push("/profile/delete-account"),
          },
        ],
      },
      {
        title: "More info and support",
        data: [
          {
            title: "Help",
            iconName: "help-circle-outline",
            onPress: () => router.push("/profile/help"),
          },
          {
            title: "About",
            iconName: "information-circle-outline",
            onPress: () => router.push("/profile/about"),
          },
          {
            title: "Terms of Service",
            iconName: "document-text-outline",
            onPress: () => router.push("/legal/terms"),
          },
          {
            title: "Privacy Policy",
            iconName: "shield-checkmark-outline",
            onPress: () => router.push("/legal/privacy"),
          },
        ],
      },
    ],
    [router, user?.isPrivate, closeFriendCount]
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        data: section.data.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            (item.subTitle && item.subTitle.toLowerCase().includes(query))
        ),
      }))
      .filter((section) => section.data.length > 0);
  }, [sections, searchQuery]);

  return (
    <ScreenBackground style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          title="Settings and activity"
          leftContent={<BackButton color={colors.text} />}
        />
        <ThemedView
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.buttonBackgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather
            name="search"
            size={20}
            color={colors.textDim}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.text,
                backgroundColor: colors.buttonBackgroundSecondary,
              },
            ]}
            placeholder="Search settings"
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </ThemedView>

        <ThemedScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          {filteredSections.map((section, index) => (
            <ThemedView key={index}>
              <ThemedView style={styles.sectionTitleWrapper}>
                <ThemedText
                  style={[styles.sectionTitle, { color: colors.textDim }]}
                >
                  {section.title}
                </ThemedText>
              </ThemedView>
              {section.data.map((item, i) => (
                <SettingsItem
                  key={`${section.title}-${i}`}
                  title={item.title}
                  subTitle={item.subTitle}
                  iconName={item.iconName as any}
                  onPress={item.onPress}
                  card
                />
              ))}
              {index < filteredSections.length - 1 && <Divider />}
            </ThemedView>
          ))}

          <TouchableOpacity
            style={styles.logoutContainer}
            onPress={() => setShowLogoutModal(true)}
          >
            <ThemedText style={[styles.logoutText, { color: colors.red }]}>
              Log Out
            </ThemedText>
          </TouchableOpacity>
          <AccountCentreModal
            visible={showAccountCentre}
            onClose={() => setShowAccountCentre(false)}
          />
        </ThemedScrollView>
      </ThemedSafeArea>
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: StatusBar.currentHeight || 0,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    lineHeight: 18.8,
  },
  sectionTitleWrapper: {
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 4,
  },
  logoutContainer: {
    marginTop: 10,
    marginHorizontal: 20,
    paddingBottom: 70,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
