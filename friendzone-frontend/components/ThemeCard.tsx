import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
} from "react-native";
import { ThemeType } from "@/store/themeStore";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width / 3 - 20;

interface ThemeCardProps {
  themeName: ThemeType;
  onPress: (themeName: ThemeType) => void;
  isSelected?: boolean;
  //   isLarge?: boolean;
  style?: ViewStyle;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  themeName,
  onPress,
  isSelected,
  style,
}) => {
  const { colors } = useTheme();
  const themeColors = Colors[themeName] ?? Colors.light;

  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        { borderColor: colors.border },
        isSelected && {
          borderColor: themeColors.primary,
          borderWidth: 3,
        },
        // isLarge && styles.largeCard,
        style,
      ]}
      onPress={() => onPress(themeName)}
    >
      <ThemedView
        style={[
          styles.themeSwatch,
          {
            backgroundColor: themeColors.background || Colors.light.background,
          },
        ]}
      />
      <ThemedText
        style={styles.themeNameText}
      >
        {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
      </ThemedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  themeCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH + 20,
    margin: 8,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  largeCard: {
    width: ITEM_WIDTH * 1.2,
    height: (ITEM_WIDTH + 20) * 1.2,
    borderRadius: 15,
    padding: 10,
  },
  themeSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  themeNameText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default ThemeCard;
