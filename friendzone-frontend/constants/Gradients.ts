import { ColorValue } from "react-native";

export type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

export const gradientFrameColors: Record<string, GradientColors> = {
  birthday: ["#f59e0b", "#ef4444", "#f97316"],
  creative: ["#8B008B", "#FF1493", "#4B0082"],
  coder: ["#00FFFF", "#008080", "#20B2AA"],
  location: ["#4682B4", "#708090", "#D3D3D3"],
};
