import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Redirect, useRouter } from "expo-router";
import { Ionicons, SimpleLineIcons } from "@expo/vector-icons";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import StoryRingList from "@/components/StoryRingList";
import { ThemedText } from "@/components/ThemedText";
import { LinearGradient } from "expo-linear-gradient";
import ChatService, { ChatPreviewResponse } from "@/services/ChatService";
import NotificationService from "@/services/NotificationService";
import { ThemedView } from "@/components/ThemedView";

export default function HomeScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, authLoading, user, accessToken } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const totalUnreadChats = unreadChatIds.size;

  const fetchInitialUnreadChats = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await ChatService.getUserChats(accessToken, 1, 1000);
      const chats: ChatPreviewResponse[] = res.chats || [];

      const initialUnreadSet = new Set<string>();
      chats.forEach(chat => {
        if (chat.unreadCount > 0) {
          initialUnreadSet.add(chat.id);
        }
      });
      setUnreadChatIds(initialUnreadSet);
    } catch (err) {
      console.error("Error fetching initial unread chats:", err);
    }
  }, [accessToken]);

  const fetchInitialUnreadNotificationCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await NotificationService.getUnreadNotificationCount(accessToken);
      setHasUnreadNotifications(res.count > 0);
    } catch (err) {
      console.error("Error fetching initial unread notification count:", err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInitialUnreadChats();
      fetchInitialUnreadNotificationCount();
    }
  }, [isAuthenticated, fetchInitialUnreadChats, fetchInitialUnreadNotificationCount]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("setUserId", user._id);

    const handleChatPreviewUpdate = (chatPreview: ChatPreviewResponse) => {
      setUnreadChatIds((prevIds) => {
        const newIds = new Set(prevIds);
        if (chatPreview.unreadCount > 0) {
          newIds.add(chatPreview.id);
        } else {
          newIds.delete(chatPreview.id);
        }
        return newIds;
      });
    };

    const handleUnreadNotificationCountUpdate = ({ count }: { count: number }) => {
      setHasUnreadNotifications(count > 0);
    };

    socket.on("chatPreviewUpdate", handleChatPreviewUpdate);
    socket.on("unreadNotificationCountUpdate", handleUnreadNotificationCountUpdate);

    return () => {
      socket.off("chatPreviewUpdate", handleChatPreviewUpdate);
      socket.off("unreadNotificationCountUpdate", handleUnreadNotificationCountUpdate);
    };
  }, [socket, user]);

  if (authLoading) return <ActivityIndicator style={styles.activityIndicator} color={colors.primary} size="large" />;

  if (!isAuthenticated) return <Redirect href="/(auth)/AuthChoice" />;

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.container}>
        <CommonHeader
          leftContent={<ThemedText style={styles.title}>FriendZone</ThemedText>}
          rightContent1={
            <TouchableOpacity onPress={() => router.push("/(notifications)")} style={styles.notificationIconContainer}>
              <SimpleLineIcons name="heart" size={24} color={colors.text} />
              {hasUnreadNotifications && (
                <ThemedView style={[styles.notificationDot, { backgroundColor: 'red' }]} />
              )}
            </TouchableOpacity>
          }
          rightContent2={
            <TouchableOpacity onPress={() => router.push("/(chat)")} style={styles.chatIconContainer}>
              <Ionicons
                name="chatbubble-outline"
                size={25}
                color={colors.text}
              />
              {totalUnreadChats > 0 && (
                <ThemedView style={[styles.badge, { backgroundColor: 'red' }]}>
                  <ThemedText style={[styles.badgeText, { color: '#fff' }]}>
                    {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
                  </ThemedText>
                </ThemedView>
              )}
            </TouchableOpacity>
          }
          showBottomBorder={true}
        />
        <StoryRingList />
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  activityIndicator: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  chatIconContainer: {
    position: 'relative',
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 18,
  },
  notificationIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 1,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});