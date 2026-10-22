import { Meeting } from "@/types/meeting.type";
import { ART, ArtTheme } from "@/constants/artPalettes";

type PlanLike = Pick<Meeting, "status" | "kind" | "startTime" | "endTime"> & { title?: string };

const RULES: { key: string; words: RegExp }[] = [
  { key: "coffee", words: /\b(chai|tea|coffee|cafe|café|latte)\b/i },
  { key: "food", words: /\b(dinner|lunch|breakfast|brunch|food|eat|pizza|biryani|burger|restaurant|thali|momos|snack)\b/i },
  { key: "movie", words: /\b(movie|film|cinema|netflix|series|watch)\b/i },
  { key: "game", words: /\b(game|gaming|ludo|pubg|valorant|cricket|football|match|play)\b/i },
  { key: "study", words: /\b(study|exam|homework|library|revision|assignment|class)\b/i },
  { key: "party", words: /\b(party|birthday|celebrat|bash|wedding)\b/i },
  { key: "travel", words: /\b(trip|travel|ride|drive|road|trek|hike|beach|flight)\b/i },
  { key: "fitness", words: /\b(gym|run|running|workout|walk|yoga|swim|cycle)\b/i },
];

export const planTheme = (plan: PlanLike): ArtTheme => {
  if (plan.status === "live") return ART.live;
  if (plan.status === "completed") return ART.past;
  if (plan.status === "cancelled") return ART.cancelled;
  const title = plan.title || "";
  const match = RULES.find((rule) => rule.words.test(title));
  if (match) return ART[match.key];
  return plan.kind === "video" ? ART.call : ART.hangout;
};

const span = (ms: number): string => {
  const minutes = Math.max(Math.round(ms / 60000), 1);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest && hours < 6 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
};

export const planCountdown = (plan: PlanLike, now: number = Date.now()): string => {
  if (plan.status === "cancelled") return "Cancelled";
  if (plan.status === "completed") return "Ended";
  const start = new Date(plan.startTime).getTime();
  if (plan.status === "live") {
    const end = plan.endTime ? new Date(plan.endTime).getTime() : 0;
    return end > now ? `Live · ends in ${span(end - now)}` : "Live now";
  }
  const diff = start - now;
  if (diff <= 60000) return "Starting now";
  return `Starts in ${span(diff)}`;
};
