import { Platform, TextStyle } from "react-native";

export type StoryFontKey = "classic" | "modern" | "strong" | "serif" | "mono" | "script";
export type StoryTextBg = "none" | "solid" | "soft";
export type StoryTextAlign = "left" | "center" | "right";

export type StoryTextStyle = {
  font: StoryFontKey;
  size: number;
  color: string;
  bg: StoryTextBg;
  align: StoryTextAlign;
};

export type StoryMusic = {
  title: string;
  artist: string;
  artwork?: string;
  previewUrl: string;
};

export const DEFAULT_TEXT_STYLE: StoryTextStyle = {
  font: "modern",
  size: 28,
  color: "#FFFFFF",
  bg: "soft",
  align: "center",
};

export const MIN_TEXT_SIZE = 14;
export const MAX_TEXT_SIZE = 64;

// Sizes are stored for a 390pt wide screen and scaled to the viewer's width.
export const TEXT_REFERENCE_WIDTH = 390;

export const STORY_FONTS: { key: StoryFontKey; label: string; style: TextStyle }[] = [
  { key: "classic", label: "Classic", style: { fontWeight: "500" } },
  { key: "modern", label: "Modern", style: { fontWeight: "800" } },
  { key: "strong", label: "Strong", style: { fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 } },
  {
    key: "serif",
    label: "Serif",
    style: { fontFamily: Platform.select({ ios: "Georgia", default: "serif" }), fontWeight: "700" },
  },
  {
    key: "mono",
    label: "Typewriter",
    style: { fontFamily: Platform.select({ ios: "Courier New", default: "monospace" }), fontWeight: "700" },
  },
  {
    key: "script",
    label: "Script",
    style: {
      fontFamily: Platform.select({ ios: "Snell Roundhand", default: "cursive" }),
      fontWeight: "700",
    },
  },
];

export const STORY_TEXT_COLORS = [
  "#FFFFFF",
  "#000000",
  "#FF3B5C",
  "#FF9F0A",
  "#FFD60A",
  "#30D158",
  "#0A84FF",
  "#BF5AF2",
  "#FF8AD8",
  "#8E8E93",
];

export const fontStyleFor = (key: StoryFontKey): TextStyle =>
  (STORY_FONTS.find((font) => font.key === key) ?? STORY_FONTS[1]).style;

const channels = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0) as [number, number, number];
};

const isLight = (hex: string) => {
  const [r, g, b] = channels(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

// Resolves the text and background colours a style produces, Instagram style:
// with a background the chosen colour fills the box and the text flips to stay readable.
export const resolveTextColors = (style: StoryTextStyle) => {
  if (style.bg === "none") return { text: style.color, background: "transparent" };
  const text = isLight(style.color) ? "#000000" : "#FFFFFF";
  if (style.bg === "solid") return { text, background: style.color };
  const [r, g, b] = channels(style.color);
  return { text, background: `rgba(${r},${g},${b},0.6)` };
};

export const nextTextBg = (bg: StoryTextBg): StoryTextBg =>
  bg === "none" ? "solid" : bg === "solid" ? "soft" : "none";

export const nextTextAlign = (align: StoryTextAlign): StoryTextAlign =>
  align === "center" ? "left" : align === "left" ? "right" : "center";

export const serializeStoryTextStyle = (style: StoryTextStyle) => JSON.stringify(style);
