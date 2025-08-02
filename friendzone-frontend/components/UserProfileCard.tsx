import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import UserAvatar from "@/components/UserAvatar";
import { getUserAvatar } from "@/constants/Functions";

interface UserProfileCardProps {
  userId: string;
  username: string;
  avatar: string | null;
  description?: string;
  rightActionComponent: React.ReactNode;
  onPress?: () => void;
  isLoading?: boolean;
  usernameColor?: string;
  descriptionColor?: string;
}

export default function UserProfileCard({
  userId,
  username,
  avatar,
  description,
  rightActionComponent,
  onPress,
  isLoading = false,
  usernameColor,
  descriptionColor,
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
      <View style={styles.userInfo}>
        <ThemedText style={[styles.username, { color: usernameColor || colors.text }]}>
          {username}
        </ThemedText>
        {description && (
          <ThemedText style={[styles.description, { color: descriptionColor || colors.textDim }]}>
            {description}
          </ThemedText>
        )}
      </View>
      <View style={styles.actionContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          rightActionComponent
        )}
      </View>
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
    minWidth: 60,
  },
});