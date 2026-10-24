import React from "react";
import { RefreshControl, RefreshControlProps } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function AppRefreshControl(props: RefreshControlProps) {
  const { colors } = useTheme();
  return (
    <RefreshControl
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.backgroundSecondary}
      {...props}
    />
  );
}
