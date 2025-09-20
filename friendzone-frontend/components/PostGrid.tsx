import React from "react";
import {
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  FlatList
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedView } from "./ThemedView";

const { width } = Dimensions.get("window");
const SPACING = 2;
const numColumns = 3;

const horizontalPadding = 2;
const ITEM_SIZE =
  (width - horizontalPadding * 2 - SPACING * (numColumns - 1)) / numColumns;

export interface PostItem {
  id: string;
  thumbnail: string;
  type?: "image" | "video";
  isMultiple?: boolean;
}

interface PostGridProps {
  posts: PostItem[];
  onPressPost?: (item: PostItem) => void;
}

const PostTypeIcon = ({
  type,
  isMultiple,
}: {
  type?: "image" | "video";
  isMultiple?: boolean;
}) => {
  let iconName: keyof typeof MaterialCommunityIcons.glyphMap | null = null;
  if (type === "video") {
    iconName = "motion-play";
  } else if (isMultiple) {
    iconName = "image-multiple";
  }

  if (!iconName) {
    return null;
  }

  return (
    <ThemedView style={styles.iconContainer}>
      <MaterialCommunityIcons name={iconName} size={18} color="white" />
    </ThemedView>
  );
};

const PostGrid: React.FC<PostGridProps> = ({ posts, onPressPost }) => {
  const renderItem = ({ item }: { item: PostItem }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.itemContainer}
      activeOpacity={0.8}
      onPress={() => onPressPost?.(item)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.media} />
      <PostTypeIcon type={item.type} isMultiple={item.isMultiple} />
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      contentContainerStyle={styles.gridContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false} // Disable FlatList scrolling to allow the parent ScrollView to handle it
    />
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    paddingHorizontal: horizontalPadding,
  },
  itemContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: SPACING / 2,
  },
  media: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: "#ccc",
  },
  iconContainer: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 10,
    padding: 3,
  },
});

export default PostGrid;
