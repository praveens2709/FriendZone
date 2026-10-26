export type StoryFilterKey = "none" | "warm" | "cool" | "rose" | "sunset" | "fade" | "night";

export type StorySticker = {
  id: string;
  kind: "emoji" | "mention" | "time";
  text: string;
  userId?: string | null;
  // Centre of the sticker as a fraction of the canvas.
  x: number;
  y: number;
  // Relative to the base size, which itself scales with the canvas width.
  scale: number;
  rotation: number;
};

export type StoryStroke = {
  color: string;
  // Stroke width as a fraction of the canvas width.
  width: number;
  // Flat [x0, y0, x1, y1, ...] with each value as a fraction of the canvas.
  points: number[];
};

export const STORY_FILTERS: {
  key: StoryFilterKey;
  label: string;
  // Tint drawn over the media; two colours make a top-to-bottom gradient.
  tint: readonly [string, string] | null;
}[] = [
  { key: "none", label: "Normal", tint: null },
  { key: "warm", label: "Warm", tint: ["rgba(255,150,40,0.22)", "rgba(255,120,20,0.22)"] },
  { key: "cool", label: "Cool", tint: ["rgba(40,130,255,0.22)", "rgba(60,160,255,0.22)"] },
  { key: "rose", label: "Rose", tint: ["rgba(255,90,150,0.25)", "rgba(255,130,180,0.2)"] },
  { key: "sunset", label: "Sunset", tint: ["rgba(255,170,60,0.3)", "rgba(150,50,200,0.3)"] },
  { key: "fade", label: "Fade", tint: ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.22)"] },
  { key: "night", label: "Night", tint: ["rgba(10,20,70,0.4)", "rgba(10,10,40,0.45)"] },
];

export const STICKER_EMOJIS = [
  "😀", "😂", "🥹", "😍", "😎", "🥳", "😭", "🤯", "🙈", "😴",
  "👍", "👏", "🙌", "🤝", "💪", "🙏", "👀", "🫶", "✌️", "🤞",
  "❤️", "🔥", "✨", "💯", "🎉", "🎂", "🎁", "🎶", "⭐", "💫",
  "☀️", "🌙", "🌈", "🌸", "🌊", "🍕", "🍔", "🍟", "🍩", "☕",
  "🍻", "⚽", "🏏", "🎮", "📸", "✈️", "🏖️", "🚗", "🐶", "🐱",
];

export const DRAW_COLORS = [
  "#FFFFFF",
  "#000000",
  "#FF3B5C",
  "#FF9F0A",
  "#FFD60A",
  "#30D158",
  "#0A84FF",
  "#BF5AF2",
];

export const DRAW_WIDTHS = [0.008, 0.016, 0.03];

export const STICKER_BASE_SIZE = 56;
export const STICKER_REFERENCE_WIDTH = 390;

export const newStickerId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const timeStickerText = (date = new Date()) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const mediaExtras = (parts: {
  stickers: StorySticker[];
  drawing: StoryStroke[];
  filter: StoryFilterKey;
}) => ({
  stickers: parts.stickers.map(({ id: _id, ...sticker }) => sticker),
  drawing: parts.drawing,
  filter: parts.filter,
});
