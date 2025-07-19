import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import UserAvatar from "@/components/UserAvatar";
import { getUserAvatar } from "@/constants/Functions";
import { ThemedView } from "./ThemedView";

interface UserProfileCardProps {
  userId: string;
  username: string;
  avatar: string | null;
  description?: string;
  rightActionComponent: React.ReactNode;
  onPress?: () => void;
  isLoading?: boolean;
}

export default function UserProfileCard({
  userId,
  username,
  avatar,
  description,
  rightActionComponent,
  onPress,
  isLoading = false,
}: UserProfileCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={isLoading}
    >
      <UserAvatar
        imageUri={getUserAvatar({ avatar, username })}
        size={45}
        style={[styles.avatar, { borderColor: colors.border }]}
      />
      <ThemedView style={styles.userInfo}>
        <ThemedText style={styles.username}>{username}</ThemedText>
        {description && (
          <ThemedText style={[styles.description, { color: colors.textDim }]}>
            {description}
          </ThemedText>
        )}
      </ThemedView>
      <ThemedView style={styles.actionContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          rightActionComponent
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
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
    fontSize: 17,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  actionContainer: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 110,
  },
});