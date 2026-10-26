import React, { useState } from "react";
import { GestureResponderHandlers, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import {
  DEFAULT_TEXT_STYLE,
  StoryTextStyle,
  TEXT_REFERENCE_WIDTH,
  fontStyleFor,
  resolveTextColors,
} from "@/constants/storyText";

interface StoryTextOverlayProps {
  text: string;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  textStyle?: StoryTextStyle | null;
  handlers?: GestureResponderHandlers;
  onMeasure?: (width: number, height: number) => void;
}

export default function StoryTextOverlay({
  text,
  x,
  y,
  containerWidth,
  containerHeight,
  textStyle,
  handlers,
  onMeasure,
}: StoryTextOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const style = textStyle ?? DEFAULT_TEXT_STYLE;
  const colors = resolveTextColors(style);
  const fontSize = style.size * (containerWidth / TEXT_REFERENCE_WIDTH);

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
      <Text
        style={[
          styles.text,
          fontStyleFor(style.font),
          {
            color: colors.text,
            backgroundColor: colors.background,
            fontSize,
            lineHeight: fontSize * 1.25,
            textAlign: style.align,
            paddingHorizontal: style.bg === "none" ? 0 : fontSize * 0.5,
            paddingVertical: style.bg === "none" ? 0 : fontSize * 0.3,
            borderRadius: fontSize * 0.4,
          },
          style.bg === "none" && styles.shadow,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { position: "absolute", zIndex: 4 },
  text: { overflow: "hidden" },
  shadow: { textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
});
