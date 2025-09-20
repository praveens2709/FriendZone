import React from "react";
import ContentLoader, { Circle } from "react-content-loader/native";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet } from "react-native";
import { ThemedView } from "./ThemedView";

const CategoryLoader: React.FC = () => {
  const { colors } = useTheme();

  return (
    <ThemedView style={styles.container}>
      {[...Array(3)].map((_, i) => (
        <ContentLoader
          key={i}
          speed={1}
          width={160}
          height={160}
          viewBox="0 0 100 100"
          backgroundColor={colors.buttonBackgroundSecondary}
          foregroundColor={colors.textSecondary}
          opacity={0.8}
        >
          <Circle cx="50" cy="50" r="45" />
        </ContentLoader>
      ))}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginTop: 30,
    marginBottom: 35,
    gap: 50,
  },
});

export default CategoryLoader;
