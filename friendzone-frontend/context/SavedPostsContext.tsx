import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import PostService from "@/services/PostService";
import { useAuth } from "@/context/AuthContext";
import { Post } from "@/types/post.type";

interface SavedPostsContextType {
    savedPostIds: Set<string>;
    toggleSave: (postId: string) => Promise<void>;
    isPostSaved: (postId: string) => boolean;
    refreshSavedPosts: () => Promise<void>;
}

const SavedPostsContext = createContext<SavedPostsContextType | undefined>(
    undefined
);

export const useSavedPosts = (): SavedPostsContextType => {
    const context = useContext(SavedPostsContext);
    if (!context) {
        throw new Error("useSavedPosts must be used within a SavedPostsProvider");
    }
    return context;
};

export const SavedPostsProvider = ({ children }: { children: ReactNode }) => {
    const { accessToken, isAuthenticated } = useAuth();
    const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

    const fetchSavedPosts = useCallback(async () => {
        if (!accessToken || !isAuthenticated) {
            setSavedPostIds(new Set());
            return;
        }
        try {
            const posts = await PostService.getSavedPosts(accessToken);
            const ids = new Set(posts.map((p) => p._id));
            setSavedPostIds(ids);
        } catch (error) {
            console.error("Failed to fetch saved posts for context:", error);
        }
    }, [accessToken, isAuthenticated]);

    useEffect(() => {
        fetchSavedPosts();
    }, [fetchSavedPosts]);

    const toggleSave = useCallback(
        async (postId: string) => {
            if (!accessToken) return;

            setSavedPostIds((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(postId)) {
                    newSet.delete(postId);
                } else {
                    newSet.add(postId);
                }
                return newSet;
            });

            try {
                const response = await PostService.toggleSave(postId, accessToken);
                setSavedPostIds((prev) => {
                    const newSet = new Set(prev);
                    if (response.saved) {
                        newSet.add(postId);
                    } else {
                        newSet.delete(postId);
                    }
                    return newSet;
                });

            } catch (error) {
                console.error("Failed to toggle save in context:", error);
                setSavedPostIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(postId)) {
                        newSet.delete(postId);
                    } else {
                        newSet.add(postId);
                    }
                    return newSet;
                });
                throw error;
            }
        },
        [accessToken]
    );

    const isPostSaved = useCallback(
        (postId: string) => {
            return savedPostIds.has(postId);
        },
        [savedPostIds]
    );

    return (
        <SavedPostsContext.Provider
            value={{
                savedPostIds,
                toggleSave,
                isPostSaved,
                refreshSavedPosts: fetchSavedPosts,
            }}
        >
            {children}
        </SavedPostsContext.Provider>
    );
};
