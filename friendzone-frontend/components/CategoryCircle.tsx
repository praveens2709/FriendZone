import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { ThemedView } from "./ThemedView";

interface CategoryCircleProps {
  mainImage: string;
  size?: number;
  avatars: string[];
  avatarMinSize?: number;
  avatarMaxSize?: number;
  duration?: number;
  label?: string;
  onPress: () => void;
}

const OrbitingAvatar: React.FC<{
  avatar: string;
  index: number;
  total: number;
  mainRadius: number;
  avatarSize: number;
  center: number;
  duration: number;
  orbitRadius: number;
}> = ({
  avatar,
  index,
  total,
  mainRadius,
  avatarSize,
  center,
  duration,
  orbitRadius,
}) => {
  const { colors } = useTheme();
  const initial = (index * 360) / total;
  const angle = useSharedValue(initial);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(initial + 360, {
        duration,
        easing: Easing.linear,
      }),
      -1
    );
  }, [angle, initial, duration]);

  const wobble = useSharedValue(0);
  useEffect(() => {
    wobble.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const rad = (angle.value * Math.PI) / 180;
    const left =
      center + (orbitRadius + wobble.value) * Math.cos(rad) - avatarSize / 2;
    const top =
      center + (orbitRadius + wobble.value) * Math.sin(rad) - avatarSize / 2;

    return {
      position: "absolute" as const,
      left,
      top,
    };
  });

  return (
    <Animated.Image
      source={{ uri: avatar }}
      style={[
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          borderWidth: 2,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
};

export default function CategoryCircle({
  mainImage,
  size = 120,
  avatars = [],
  avatarMinSize = 42,
  avatarMaxSize = 56,
  duration = 40000,
  label,
  onPress
}: CategoryCircleProps) {
  const { colors } = useTheme();
  const containerSize = size + avatarMaxSize * 1.6;
  const center = containerSize / 2;

  const randomizedSizes = useMemo(
    () =>
      avatars.map(
        () =>
          Math.floor(
            Math.random() * (avatarMaxSize - avatarMinSize + 1)
          ) + avatarMinSize
      ),
    [avatars, avatarMinSize, avatarMaxSize]
  );

  const randomizedOrbits = useMemo(
    () =>
      avatars.map(
        () =>
          size / 2 +
          Math.floor(Math.random() * 16) -
          8
      ),
    [avatars, size]
  );

  const randomizedDurations = useMemo(
    () =>
      avatars.map(
        () =>
          duration *
          (0.85 + Math.random() * 0.3)
      ),
    [avatars, duration]
  );

  return (
    <TouchableOpacity onPress={onPress}>
      <ThemedView
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            marginHorizontal: 6,
          },
        ]}
      >
        <ThemedView
          style={{
            position: "absolute",
            width: size + 12,
            height: size + 12,
            borderRadius: (size + 12) / 2,
            borderWidth: 2,
            borderColor: colors.border,
            left: center - (size + 12) / 2,
            top: center - (size + 12) / 2,
          }}
        />

        <Animated.Image
          source={{ uri: mainImage }}
          style={[
            styles.mainCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              left: center - size / 2,
              top: center - size / 2,
              backgroundColor: colors.background,
              shadowColor: colors.primary,
            },
          ]}
        />

        {label && (
          <ThemedView
            style={{
              position: "absolute",
              top: center - 12,
              left: center - size / 2,
              width: size,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: colors.primary,
                borderRadius: 4,
                color: colors.buttonText,
                overflow: "hidden",
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {label}
            </Text>
          </ThemedView>
        )}

        {avatars.map((a, i) => (
          <OrbitingAvatar
            key={i}
            avatar={a}
            index={i}
            total={avatars.length}
            mainRadius={size}
            avatarSize={randomizedSizes[i]}
            center={center}
            duration={randomizedDurations[i]}
            orbitRadius={randomizedOrbits[i]}
          />
        ))}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  mainCircle: {
    position: "absolute",
    resizeMode: "cover",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
});