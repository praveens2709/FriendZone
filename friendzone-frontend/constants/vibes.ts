import { Ionicons } from "@expo/vector-icons";

export type VibeKind =
  | "free_tonight"
  | "studying"
  | "coffee"
  | "game_night"
  | "chilling"
  | "need_company"
  | "busy";

export interface VibeOption {
  kind: VibeKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const VIBE_OPTIONS: VibeOption[] = [
  { kind: "free_tonight", label: "Free tonight", icon: "moon-outline" },
  { kind: "coffee", label: "Coffee?", icon: "cafe-outline" },
  { kind: "game_night", label: "Game night", icon: "game-controller-outline" },
  { kind: "need_company", label: "Need company", icon: "people-outline" },
  { kind: "chilling", label: "Chilling", icon: "home-outline" },
  { kind: "studying", label: "Studying", icon: "book-outline" },
  { kind: "busy", label: "Busy", icon: "notifications-off-outline" },
];

export const vibeOption = (kind: string): VibeOption =>
  VIBE_OPTIONS.find((o) => o.kind === kind) ?? VIBE_OPTIONS[4];

export const VIBE_DURATIONS = [
  { hours: 3, label: "3h" },
  { hours: 6, label: "6h" },
  { hours: 24, label: "Today", untilMidnight: true },
];

export const nextMidnightIso = (): string => {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  if (midnight.getTime() - now.getTime() < 60 * 1000) midnight.setDate(midnight.getDate() + 1);
  return midnight.toISOString();
};

export const timeLeftLabel = (expiresAt: string): string => {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.floor(ms / 60000))}m left`;
};
