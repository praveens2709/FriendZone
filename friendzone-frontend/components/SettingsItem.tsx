import React from "react";
import { StyleSheet, TouchableOpacity, View, TextStyle, ViewStyle } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "./ThemedView";

interface SettingsItemProps {
  title: string;
  subTitle?: string;
  iconName?:
    | keyof typeof Ionicons.glyphMap
    | keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  rightContent?: React.ReactNode;
  textStyle?: TextStyle;
  noHorizontalPadding?: boolean;
  card?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  subTitle,
  iconName,
  onPress,
  rightContent,
  textStyle,
  noHorizontalPadding,
  card = false,
}) => {
  const { colors } = useTheme();

  const IconComponent = () => {
    const materialCommunityIcons = ["email-outline", "shield-outline"];
    if (iconName && materialCommunityIcons.includes(iconName)) {
      return MaterialCommunityIcons;
    }
    return Ionicons;
  };

  const Icon = IconComponent();

  const itemContainerStyle: ViewStyle[] = [styles.itemContainer];
  if (card) {
    itemContainerStyle.push(styles.itemCard, {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    });
  } else if (!noHorizontalPadding) {
    itemContainerStyle.push(styles.itemDefaultPadding);
  }

  return (
    <TouchableOpacity onPress={onPress} style={itemContainerStyle}>
      <ThemedView style={styles.itemLeft}>
        {iconName && (
          <Icon
            name={iconName as any}
            size={24}
            color={colors.text}
            style={styles.itemIcon}
          />
        )}
        <ThemedView style={styles.itemTextContainer}>
          <ThemedText style={[styles.itemTitle, textStyle]}>{title}</ThemedText>
          {subTitle && (
            <ThemedText
              style={[styles.itemSubTitle, { color: colors.textDim }]}
            >
              {subTitle}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
      <ThemedView>
        {rightContent || (
          <Ionicons name="chevron-forward" size={24} color={colors.textDim} />
        )}
      </ThemedView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    position: "relative",
  },
  itemDefaultPadding: {
    paddingHorizontal: 20,
  },
  itemCard: {
    paddingHorizontal: 16,
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  itemIcon: {
    marginRight: 10,
  },
  itemTextContainer: {
    flexShrink: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemSubTitle: {
    fontSize: 14,
  },
});

export default SettingsItem;