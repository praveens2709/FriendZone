import React from "react";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

type Props = SafeAreaViewProps & {
  lightColor?: string;
  darkColor?: string;
};

const ThemedSafeArea = ({ children, style, lightColor, darkColor, ...rest }: Props) => {
  const { colors } = useTheme();
  const isDark = colors.isDark;

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDark ? darkColor ?? colors.background : lightColor ?? colors.background,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
};

export default ThemedSafeArea;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
