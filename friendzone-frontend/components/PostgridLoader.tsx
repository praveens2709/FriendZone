import React from "react";
import ContentLoader, { Rect } from "react-content-loader/native";
import { Dimensions, StyleSheet, FlatList } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "./ThemedView";

const { width: screenWidth } = Dimensions.get("window");
const numColumns = 3;
const spacing = 2;
const postSize = (screenWidth - spacing * (numColumns + 1)) / numColumns;

const numPosts = 12;

const PostGridLoader: React.FC = () => {
  const { colors } = useTheme();

  return (
    <FlatList
      data={Array.from({ length: numPosts })}
      keyExtractor={(_, i) => i.toString()}
      numColumns={numColumns}
      columnWrapperStyle={{
        justifyContent: "space-between",
        marginBottom: spacing,
      }}
      renderItem={() => (
        <ThemedView style={{ width: postSize, height: postSize }}>
          <ContentLoader
            speed={1}
            width={postSize}
            height={postSize}
            viewBox={`0 0 ${postSize} ${postSize}`}
            backgroundColor={colors.buttonBackgroundSecondary}
            foregroundColor={colors.textSecondary}
            opacity={0.8}
          >
            <Rect
              x="0"
              y="0"
              rx="0"
              ry="0"
              width={postSize}
              height={postSize}
            />
          </ContentLoader>
        </ThemedView>
      )}
    />
  );
};

const styles = StyleSheet.create({});
export default PostGridLoader;
