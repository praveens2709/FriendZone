import React, { useMemo } from "react";
import { ThemeContext, useTheme } from "@/context/ThemeContext";

type ThemeColors = ReturnType<typeof useTheme>["colors"];

export const onArtColors = (colors: ThemeColors): ThemeColors => ({
  ...colors,
  text: "#FFFFFF",
  textDim: "rgba(255,255,255,0.82)",
  textSecondary: "rgba(255,255,255,0.92)",
  border: "rgba(255,255,255,0.5)",
  buttonBackgroundSecondary: "rgba(255,255,255,0.2)",
});

export default function OnArtTheme({ children }: { children: React.ReactNode }) {
  const base = useTheme();
  const value = useMemo(() => ({ ...base, colors: onArtColors(base.colors) }), [base]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
