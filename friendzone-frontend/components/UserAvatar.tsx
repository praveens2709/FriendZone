import React from "react";
import { Image, ViewStyle } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "./ThemedView";

interface UserAvatarProps {
  imageUri?: string | null;
  size?: number;
  style?: ViewStyle | ViewStyle[];
}

const UserAvatar: React.FC<UserAvatarProps> = ({ imageUri, size = 112, style }) => {
  const { colors } = useTheme();

  return (
    <ThemedView
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <FontAwesome
          name="user"
          size={size * 0.95}
          color={colors.textDim}
          style={{ width: "100%", textAlign: "center", marginTop: size * 0.10 }}
        />
      )}
    </ThemedView>
  );
};

export default UserAvatar;
