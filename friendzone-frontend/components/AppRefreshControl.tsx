import React from "react";
import { RefreshControl, RefreshControlProps } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function AppRefreshControl(props: RefreshControlProps) {
  const { colors } = useTheme();
  return (
    <RefreshControl
      tintColor={colors.accent}
      colors={[colors.accent]}
      progressBackgroundColor={colors.backgroundSecondary}
      {...props}
    />
  );
}
