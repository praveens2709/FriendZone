import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { STORY_FILTERS, StoryFilterKey } from "@/constants/storyDecor";

export default function StoryFilterOverlay({ filter }: { filter?: StoryFilterKey | string | null }) {
  const tint = STORY_FILTERS.find((item) => item.key === filter)?.tint;
  if (!tint) return null;
  return <LinearGradient colors={[tint[0], tint[1]]} style={styles.fill} pointerEvents="none" />;
}

const styles = StyleSheet.create({ fill: { ...StyleSheet.absoluteFillObject } });
