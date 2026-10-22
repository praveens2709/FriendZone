import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { ArtPalette } from "@/constants/artPalettes";

export default function ArtBackground({
  palette,
  color,
  glyph,
  watermark = 92,
  tint = "rgba(255,255,255,0.17)",
  scrim = false,
  glow = true,
}: {
  palette?: ArtPalette;
  color?: string;
  glyph?: keyof typeof Ionicons.glyphMap;
  watermark?: number;
  tint?: string;
  scrim?: boolean;
  glow?: boolean;
}) {
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.clip, !palette && color ? { backgroundColor: color } : null]}
      pointerEvents="none"
    >
      {palette && (
        <>
          <LinearGradient
            colors={palette}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {glow && (
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id="artGlow" cx="88%" cy="8%" rx="75%" ry="75%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#artGlow)" />
            </Svg>
          )}
        </>
      )}
      {glyph && (
        <View
          style={{
            position: "absolute",
            right: -watermark * 0.16,
            bottom: -watermark * 0.18,
            transform: [{ rotate: "-14deg" }],
          }}
        >
          <Ionicons name={glyph} size={watermark} color={tint} />
        </View>
      )}
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
