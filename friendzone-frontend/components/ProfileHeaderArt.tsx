import React from "react";
import VibeBackground from "@/components/VibeBackground";
import ArtBackground from "@/components/ui/ArtBackground";
import { ART } from "@/constants/artPalettes";
import { vibeOption } from "@/constants/vibes";

export default function ProfileHeaderArt({ vibe }: { vibe?: { kind: string } | null }) {
  if (vibe) return <VibeBackground kind={vibeOption(vibe.kind).kind} watermark={220} glow={false} />;
  return <ArtBackground palette={ART.neutral.palette} glyph={ART.neutral.glyph} watermark={220} scrim glow={false} />;
}
