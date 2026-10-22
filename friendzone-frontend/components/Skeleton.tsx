import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export function SkeletonBlock({
  width,
  height,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width: width ?? "100%", height, borderRadius: radius, backgroundColor: colors.border },
        { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] }) },
        style,
      ]}
    />
  );
}

export function ChatListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.chatRow}>
          <SkeletonBlock width={52} height={52} radius={26} />
          <View style={styles.chatText}>
            <SkeletonBlock width="45%" height={14} />
            <SkeletonBlock width="75%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function NotificationListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.chatRow}>
          <SkeletonBlock width={44} height={44} radius={22} />
          <View style={styles.chatText}>
            <SkeletonBlock width="80%" height={13} />
            <SkeletonBlock width="35%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function PostSkeleton() {
  return (
    <View style={styles.post}>
      <View style={styles.chatRow}>
        <SkeletonBlock width={36} height={36} radius={18} />
        <View style={styles.chatText}>
          <SkeletonBlock width="40%" height={13} />
          <SkeletonBlock width="25%" height={11} />
        </View>
      </View>
      <SkeletonBlock height={260} radius={18} style={{ marginTop: 12 }} />
      <SkeletonBlock width="60%" height={13} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  chatRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  chatText: { flex: 1, gap: 8 },
  post: { marginHorizontal: 14, marginTop: 10, marginBottom: 10 },
});
