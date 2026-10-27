import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSavedPosts } from "@/context/SavedPostsContext";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import PostGrid, { PostItem } from "@/components/PostGrid";
import ThemedScrollView from "@/components/ThemedScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import PostService from "@/services/PostService";
import { Post } from "@/types/post.type";

export default function SavedPostsScreen() {
    const { colors } = useTheme();
    const { accessToken } = useAuth();
    const router = useRouter();

    const { savedPostIds } = useSavedPosts();
    const [fetchedPosts, setFetchedPosts] = useState<Post[]>([]);

    const displayedPosts = fetchedPosts.filter(post => savedPostIds.has(post._id));
    const [loading, setLoading] = useState(true);

    const fetchSavedPosts = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const posts = await PostService.getSavedPosts(accessToken);
            setFetchedPosts(posts);
        } catch (error) {
            console.error("Failed to fetch saved posts:", error);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchSavedPosts();
    }, [fetchSavedPosts]);

    const handlePressPost = (item: PostItem) => {
        router.push({
            pathname: "/posts/[postId]",
            params: { postId: item.id, source: "saved" },
        });
    };

    const postsForGrid: PostItem[] = displayedPosts.map((post) => ({
        id: post._id,
        thumbnail: post.images[0]?.url,
        isMultiple: post.images.length > 1,
        type: "image",
    }));

    return (
        <ScreenBackground style={styles.container}>
            <ThemedSafeArea style={styles.safeArea}>
                <CommonHeader
                    title="Saved Posts"
                    leftContent={<BackButton color={colors.text} />}
                />

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                ) : displayedPosts.length > 0 ? (
                    <ThemedScrollView contentContainerStyle={styles.scrollContent}>
                        <PostGrid posts={postsForGrid} onPressPost={handlePressPost} />
                    </ThemedScrollView>
                ) : (
                    <ThemedView style={styles.emptyContainer}>
                        <View style={[styles.emptyIcon, { borderColor: colors.border }]}>
                            <Ionicons name="bookmark-outline" size={50} color={colors.textDim} />
                        </View>
                        <ThemedText style={[styles.emptyText, { color: colors.text }]}>
                            No saved posts
                        </ThemedText>
                        <ThemedText
                            style={[styles.emptySubtext, { color: colors.textDim }]}
                        >
                            When you save posts, they'll appear here.
                        </ThemedText>
                    </ThemedView>
                )}
            </ThemedSafeArea>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: "transparent",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContent: {
        paddingTop: 8,
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        backgroundColor: "transparent",
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 8,
        textAlign: "center",
    },
    emptySubtext: {
        fontSize: 16,
        textAlign: "center",
        lineHeight: 22,
    },
});
