import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";

export default function StoryAvatarRing({
  size,
  hasStory,
  seen,
  onPress,
  children,
}: {
  size: number;
  hasStory: boolean;
  seen: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  if (!hasStory) return <>{children}</>;

  const outer = size + 10;
  return (
    <Pressable onPress={onPress} style={{ width: outer, height: outer }}>
      {seen ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: outer / 2, borderWidth: 2, borderColor: colors.border },
          ]}
        />
      ) : (
        <LinearGradient
          colors={["#F9CE34", "#EE2A7B", "#6228D7"]}
          start={{ x: 0.1, y: 1 }}
          end={{ x: 0.9, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: outer / 2 }]}
        />
      )}
      <View
        style={[
          styles.gap,
          { top: 3, left: 3, right: 3, bottom: 3, borderRadius: (outer - 6) / 2, backgroundColor: colors.background },
        ]}
      />
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { position: "absolute" },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
