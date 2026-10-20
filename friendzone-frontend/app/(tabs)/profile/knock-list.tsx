import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useLocalSearchParams, useRouter } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import KnockService, { KnockRequest } from "@/services/knockService";
import { useAuth } from "@/context/AuthContext";
import ChatService from "@/services/ChatService";
import {
  getKnockListByType,
  getKnockStatusButtonText,
} from "@/utils/knock-utils";
import { KnockListType } from "@/types/knock.type";
import UserProfileCard from "@/components/UserProfileCard";
import { useSocket } from "@/context/SocketContext";

export default function KnockListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, accessToken } = useAuth();
  const { socket } = useSocket();
  const listType = params.listType as KnockListType;
  const initialData = params.data
    ? (JSON.parse(params.data as string) as KnockRequest[])
    : [];

  const [listData, setListData] = useState<KnockRequest[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!user || !accessToken) return;
    if (listData.length === 0) setLoading(true);
    try {
      const myReceivedKnocks = await KnockService.getKnockers(accessToken);
      const mySentKnocks = await KnockService.getKnocked(accessToken);

      const updatedList = getKnockListByType(
        listType,
        myReceivedKnocks,
        mySentKnocks,
        user._id
      );
      setListData(updatedList);
    } catch (error) {
      console.error("Failed to refresh knock data:", error);

    } finally {
      setLoading(false);
    }
  }, [user, accessToken, listType]);

  const isButtonDisabled = (item: KnockRequest) => {
    return (
      actionLoading === item.id ||
      (listType === "Knocking" && item.status === "pending")
    );
  };

  useEffect(() => {
    if (!socket) return;
    const onChange = () => refreshData();
    socket.on("knockStatusChanged", onChange);
    return () => {
      socket.off("knockStatusChanged", onChange);
    };
  }, [socket, refreshData]);

  const handleActionButtonPress = async (item: KnockRequest) => {
    if (!accessToken || isButtonDisabled(item)) {
      return;
    }

    setActionLoading(item.id);

    try {
      if (item.status === "lockedIn") {
        const recipientId = item.user.id;
        const chatResponse = await ChatService.createChat(
          accessToken,
          recipientId
        );

        if (chatResponse && chatResponse.chatId) {
          router.push({
            pathname: "/(chat)/[id]",
            params: {
              id: chatResponse.chatId,
              chatName: item.user.username,
              chatAvatar: item.user.avatar || "",
              isRestricted: String(chatResponse.isRestricted),
              firstMessageByKnockerId:
                chatResponse.firstMessageByKnockerId || "",
            },
          });
        }
      } else if (listType === "Knockers" && item.status === "onesidedlock") {
        await KnockService.knockBack(item.id, accessToken);

      } else if (listType === "Knocking" && item.status === "onesidedlock") {
        await KnockService.unknockUser(item.id, accessToken);

      }
      refreshData();
    } catch (error: any) {
      console.error("Action failed:", error);

    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: KnockRequest }) => {
    const buttonText = getKnockStatusButtonText(item, listType);
    const isDisabled = isButtonDisabled(item);

    return (
      <UserProfileCard
        userId={item.user.id}
        username={item.user.username}
        avatar={item.user.avatar}
        rightActionComponent={
          <TouchableOpacity
            style={[
              styles.statusButton,
              {
                backgroundColor:
                  item.status === "lockedIn"
                    ? colors.buttonBackgroundSecondary
                    : colors.primary,
                borderColor:
                  item.status === "lockedIn" ? colors.border : colors.primary,
                opacity: isDisabled ? 0.6 : 1,
              },
            ]}
            onPress={() => handleActionButtonPress(item)}
            disabled={isDisabled}
          >
            <ThemedText
              style={[
                styles.statusButtonText,
                {
                  color:
                    item.status === "lockedIn"
                      ? colors.text
                      : colors.buttonText,
                },
              ]}
            >
              {buttonText}
            </ThemedText>
          </TouchableOpacity>
        }
        isLoading={actionLoading === item.id}
      />
    );
  };

  return (
    <ScreenBackground style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton color={colors.text} />}
          title={listType}
        />
        {loading && listData.length === 0 ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText style={[styles.loadingText, { color: colors.textDim }]}>
              Loading...
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refreshData}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={() => (
              <ThemedView style={styles.emptyContainer}>
                <ThemedText
                  style={[styles.emptyText, { color: colors.textDim }]}
                >
                  No users in this category.
                </ThemedText>
              </ThemedView>
            )}
          />
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
    backgroundColor: "transparent",
  },
  loadingText: {
    marginTop: 10,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  statusButton: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
    borderWidth: 1,
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    backgroundColor: "transparent",
  },
  emptyText: {
    fontSize: 16,
  },
});
