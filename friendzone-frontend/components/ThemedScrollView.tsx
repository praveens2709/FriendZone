import React from "react";
import { ScrollViewProps, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTheme } from "@/context/ThemeContext";

type Props = ScrollViewProps & {
  lightColor?: string;
  darkColor?: string;
};

const ThemedScrollView = ({ children, style, lightColor, darkColor, ...rest }: Props) => {
  const { colors } = useTheme();
  const isDark = colors.isDark;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={[
        styles.scroll,
        {
          backgroundColor: isDark ? darkColor ?? colors.background : lightColor ?? colors.background,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
};

export default ThemedScrollView;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center'
  },
});
