import React from "react";
import { StyleSheet, TouchableOpacity, Image } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import UserAvatar from "@/components/UserAvatar";
import { useRouter } from "expo-router";
import { ThemedView } from "./ThemedView";
import { LinearGradient } from "expo-linear-gradient";
import { gradientFrameColors } from "@/constants/Gradients";

const birthdayBadge = require("../assets/images/birthday.png");
const statusBadge = require("../assets/images/soul2.png");
const statusBadge2 = require("../assets/images/code2.png");
const locationBadge = require("../assets/images/location2.png");

interface UserProfileCardProps {
  userId: string;
  username: string;
  avatar: string | null;
  description?: string;
  onPress?: () => void;
  isLoading?: boolean;
  usernameColor?: string;
  descriptionColor?: string;
  frameType?: "birthday" | "creative" | "coder" | "location";
  rightActionComponent?: React.ReactNode;
}

export default function UserProfileCard({
  userId,
  username,
  avatar,
  description,
  onPress,
  isLoading = false,
  usernameColor,
  descriptionColor,
  frameType,
  rightActionComponent,
}: UserProfileCardProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: `/profile/UserProfile`,
        params: { userId: userId },
      });
    }
  };

  const content = (
    <ThemedView style={styles.cardContent}>
      <UserAvatar
        imageUri={avatar}
        size={45}
        style={[styles.avatar, { borderColor: colors.border }]}
      />
      <ThemedView style={styles.userInfo}>
        <ThemedText
          style={[styles.username, { color: usernameColor || colors.text }]}
        >
          {username}
        </ThemedText>
        {description && (
          <ThemedText
            style={[
              styles.description,
              { color: descriptionColor || colors.textDim },
            ]}
          >
            {description}
          </ThemedText>
        )}
      </ThemedView>
      {rightActionComponent}
    </ThemedView>
  );

  const renderFramedCard = () => {
    if (frameType) {
      return (
        <LinearGradient
          colors={gradientFrameColors[frameType]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFrameContainer}
        >
          <ThemedView
            style={[
              styles.cardContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {content}
          </ThemedView>
        </LinearGradient>
      );
    }

    return <ThemedView style={styles.cardContainer}>{content}</ThemedView>;
  };

  const renderBadge = () => {
    if (frameType === "birthday") {
      return <Image source={birthdayBadge} style={styles.badge} />;
    }
    if (frameType === "creative") {
      return <Image source={statusBadge} style={styles.badge} />;
    }
    if (frameType === "coder") {
      return <Image source={statusBadge2} style={styles.badge} />;
    }
    if (frameType === "location") {
      return <Image source={locationBadge} style={styles.badge} />;
    }
    return null;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.8}
      style={[styles.touchableContainer, { marginBottom: 10 }]}
    >
      {renderFramedCard()}
      {renderBadge()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchableContainer: {
    position: "relative",
  },
  cardContainer: {
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  gradientFrameContainer: {
    borderRadius: 8,
    padding: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
  },
  avatar: {
    marginRight: 15,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
  },
  badge: {
    position: "absolute",
    right: -10,
    top: -5,
    width: 80,
    height: 80,
    resizeMode: "contain",
    zIndex: 1,
  },
});
