import React, { useState } from "react";
import { GestureResponderHandlers, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

interface StoryTextOverlayProps {
  text: string;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  handlers?: GestureResponderHandlers;
  onMeasure?: (width: number, height: number) => void;
}

export default function StoryTextOverlay({
  text,
  x,
  y,
  containerWidth,
  containerHeight,
  handlers,
  onMeasure,
}: StoryTextOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
    onMeasure?.(width, height);
  };

  return (
    <View
      {...handlers}
      onLayout={handleLayout}
      pointerEvents={handlers ? "auto" : "none"}
      style={[
        styles.holder,
        {
          maxWidth: Math.max(containerWidth - 32, 1),
          left: x * containerWidth - size.width / 2,
          top: y * containerHeight - size.height / 2,
          opacity: size.width ? 1 : 0,
        },
      ]}
    >
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { position: "absolute", zIndex: 4 },
  text: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
});
