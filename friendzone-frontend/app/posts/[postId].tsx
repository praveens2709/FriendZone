import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  ViewToken,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import PostComponent from "@/components/PostComponent";
import PostService from "@/services/PostService";
import { Post } from "@/types/post.type";
import { useAuth } from "@/context/AuthContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";

const { width } = Dimensions.get('window');

const POST_HEIGHT = width + 170;

interface ViewableItem extends ViewToken {
  item: Post;
}

export default function PostScreen() {
  const { postId } = useLocalSearchParams();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [isGloballyMuted, setIsGloballyMuted] = useState(false);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewableItem[] }) => {
      const firstVisibleItem = viewableItems[0]?.item;
      if (firstVisibleItem && firstVisibleItem.song && !isGloballyMuted) {
        setCurrentlyPlayingId(firstVisibleItem._id);
      } else {
        setCurrentlyPlayingId(null);
      }
    },
    [isGloballyMuted]
  );

  useEffect(() => {
    const fetchPosts = async () => {
      if (!postId || typeof postId !== 'string' || !accessToken) {
        setLoading(false);
        setError("Invalid post ID or authentication token.");
        return;
      }
      
      try {
        const clickedPost = await PostService.getPostById(accessToken, postId);
        
        if (!clickedPost) {
          setError("Post not found.");
          setLoading(false);
          return;
        }

        const fetchedUserPosts = await PostService.getPostsByUserId(accessToken, clickedPost.user._id);

        const initialPostIndex = fetchedUserPosts.findIndex(p => p._id === postId);
        
        if (initialPostIndex >= 0) {
          setInitialIndex(initialPostIndex);
          setCurrentlyPlayingId(fetchedUserPosts[initialPostIndex]._id);
        } else {
          setInitialIndex(0);
          setCurrentlyPlayingId(fetchedUserPosts[0]?._id || null);
        }
        setUserPosts(fetchedUserPosts);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setError("Failed to load posts. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [postId, accessToken]);

  const renderContent = () => {
    if (loading) {
      return (
        <ThemedView style={styles.centeredContainer}>
          <ActivityIndicator />
          <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
        </ThemedView>
      );
    }

    if (error) {
      return (
        <ThemedView style={styles.centeredContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      );
    }

    if (userPosts.length === 0) {
      return (
        <ThemedView style={styles.centeredContainer}>
          <ThemedText style={styles.errorText}>No post data available for this user.</ThemedText>
        </ThemedView>
      );
    }

    return (
      <FlatList
        data={userPosts}
        renderItem={({ item }) => (
          <PostComponent 
            post={item} 
            currentlyPlayingId={currentlyPlayingId}
            setCurrentlyPlayingId={setCurrentlyPlayingId}
            isActive={currentlyPlayingId === item._id}
            isGloballyMuted={isGloballyMuted}
            setIsGloballyMuted={setIsGloballyMuted}
          />
        )}
        keyExtractor={item => item._id}
        initialScrollIndex={initialIndex}
        getItemLayout={(data, index) => ({
          length: POST_HEIGHT,
          offset: POST_HEIGHT * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton onPress={() => router.back()} color={colors.text} />}
          title="Posts"
          showBottomBorder={true}
        />
        {renderContent()}
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});