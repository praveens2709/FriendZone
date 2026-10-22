import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

const COLORS = ["#6aaa64", "#c9b458", "#f06595", "#4dabf7", "#ffa94d", "#b197fc"];

type Piece = {
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
};

export default function Confetti({ active, count = 34 }: { active: boolean; count?: number }) {
  const { height } = Dimensions.get("window");
  const progress = useRef<Animated.Value[]>([]).current;

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        left: Math.random() * 100,
        size: 6 + Math.random() * 6,
        color: COLORS[index % COLORS.length],
        delay: Math.random() * 500,
        duration: 1800 + Math.random() * 1400,
        drift: (Math.random() - 0.5) * 120,
        spin: 360 + Math.random() * 540,
      })),
    [count]
  );

  while (progress.length < pieces.length) progress.push(new Animated.Value(0));

  useEffect(() => {
    if (!active) return;
    progress.forEach((value) => value.setValue(0));
    const runs = pieces.map((piece, index) =>
      Animated.timing(progress[index], {
        toValue: 1,
        duration: piece.duration,
        delay: piece.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.parallel(runs).start();
  }, [active, pieces, progress]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, index) => (
        <Animated.View
          key={index}
          style={{
            position: "absolute",
            top: -20,
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.6,
            borderRadius: 1.5,
            backgroundColor: piece.color,
            opacity: progress[index].interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: progress[index].interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.7] }) },
              { translateX: progress[index].interpolate({ inputRange: [0, 1], outputRange: [0, piece.drift] }) },
              { rotate: progress[index].interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${piece.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
