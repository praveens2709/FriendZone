import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { VibeKind } from "@/constants/vibes";

export const VIBE_PALETTES: Record<VibeKind, [string, string, string]> = {
  free_tonight: ["#141E5A", "#3B2E8F", "#8A4FD1"],
  coffee: ["#3E2418", "#7A4A2B", "#C98B4E"],
  game_night: ["#1B1148", "#5B2A9E", "#E0338E"],
  need_company: ["#A3154B", "#D9381E", "#F59F00"],
  chilling: ["#06586B", "#0F8FA8", "#4DD0E1"],
  studying: ["#0F2A6B", "#2F52C9", "#6C8BFF"],
  busy: ["#1F2429", "#3A4148", "#6C757D"],
};

const GLYPHS: Record<VibeKind, keyof typeof Ionicons.glyphMap> = {
  free_tonight: "moon",
  coffee: "cafe",
  game_night: "game-controller",
  need_company: "people",
  chilling: "home",
  studying: "book",
  busy: "notifications-off",
};

export const vibePalette = (kind: string): [string, string, string] =>
  VIBE_PALETTES[kind as VibeKind] ?? VIBE_PALETTES.chilling;

export default function VibeBackground({
  kind,
  watermark = 92,
  scrim = true,
  glow = true,
}: {
  kind: VibeKind;
  watermark?: number;
  scrim?: boolean;
  glow?: boolean;
}) {
  const palette = vibePalette(kind);
  const glyph = GLYPHS[kind] ?? GLYPHS.chilling;
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <LinearGradient
        colors={palette}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {glow && (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="glow" cx="88%" cy="8%" rx="75%" ry="75%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
        </Svg>
      )}
      <View
        style={{
          position: "absolute",
          right: -watermark * 0.16,
          bottom: -watermark * 0.18,
          transform: [{ rotate: "-14deg" }],
        }}
      >
        <Ionicons name={glyph} size={watermark} color="rgba(255,255,255,0.17)" />
      </View>
      {scrim && (
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)"]}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
});
