import { Ionicons } from "@expo/vector-icons";

export type ArtPalette = [string, string, string];

export interface ArtTheme {
  palette: ArtPalette;
  glyph: keyof typeof Ionicons.glyphMap;
}

export const ART: Record<string, ArtTheme> = {
  coffee: { palette: ["#3E2418", "#7A4A2B", "#C98B4E"], glyph: "cafe" },
  food: { palette: ["#8A1C0F", "#D9480F", "#F59F00"], glyph: "restaurant" },
  movie: { palette: ["#1A1033", "#4B2A86", "#C2255C"], glyph: "film" },
  game: { palette: ["#1B1148", "#5B2A9E", "#E0338E"], glyph: "game-controller" },
  study: { palette: ["#0F2A6B", "#2F52C9", "#6C8BFF"], glyph: "book" },
  party: { palette: ["#A3154B", "#D9381E", "#F59F00"], glyph: "balloon" },
  travel: { palette: ["#06586B", "#0F8FA8", "#4DD0E1"], glyph: "airplane" },
  fitness: { palette: ["#0B5D3B", "#2F9E44", "#94D82D"], glyph: "barbell" },
  hangout: { palette: ["#7A2E0E", "#D9480F", "#FFA94D"], glyph: "location" },
  call: { palette: ["#1C3D8F", "#4C6EF5", "#9775FA"], glyph: "videocam" },
  live: { palette: ["#7F1414", "#D63031", "#FF7675"], glyph: "radio" },
  past: { palette: ["#2F353B", "#4A5158", "#7D858C"], glyph: "checkmark-circle" },
  cancelled: { palette: ["#2F353B", "#4A5158", "#7D858C"], glyph: "close-circle" },
  neutral: { palette: ["#26334D", "#3D5A80", "#7C9CC9"], glyph: "sparkles" },
  win: { palette: ["#1E5B24", "#3F9142", "#6AAA64"], glyph: "trophy" },
  lose: { palette: ["#3A3F44", "#5C6168", "#8A5A5A"], glyph: "sad" },
};

export const STORY_BACKDROPS: { key: string; theme: ArtTheme }[] = [
  { key: "night", theme: { palette: ["#141E5A", "#3B2E8F", "#8A4FD1"], glyph: "moon" } },
  { key: "sunset", theme: { palette: ["#A3154B", "#E8590C", "#F59F00"], glyph: "sunny" } },
  { key: "ocean", theme: { palette: ["#06586B", "#0F8FA8", "#4DD0E1"], glyph: "water" } },
  { key: "forest", theme: { palette: ["#0B5D3B", "#2F9E44", "#94D82D"], glyph: "leaf" } },
  { key: "candy", theme: { palette: ["#A3154B", "#E0338E", "#F783AC"], glyph: "heart" } },
  { key: "space", theme: { palette: ["#0A0F2C", "#1B2A6B", "#4C6EF5"], glyph: "rocket" } },
];
