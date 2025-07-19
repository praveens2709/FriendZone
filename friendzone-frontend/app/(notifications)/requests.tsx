import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import KnockService, { KnockRequest } from "@/services/knockService";
import { useAuth } from "@/context/AuthContext";
import {
  formatNotificationTimestamp,
  getUserAvatar,
  showToast,
} from "@/constants/Functions";
import UserAvatar from "@/components/UserAvatar";

export default function KnockRequestsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [pendingRequests, setPendingRequests] = useState<KnockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingRequests = useCallback(
    async (isRefreshing: boolean = false) => {
      if (!accessToken) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const requests = await KnockService.getPendingKnockRequests(
          accessToken
        );
        setPendingRequests(requests);
      } catch (error) {
        console.error(
          "[KnockRequestsScreen] Error fetching knock requests:",
          error
        );
        showToast("error", "Failed to load knock requests.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const onRefresh = useCallback(() => {
    fetchPendingRequests(true);
  }, [fetchPendingRequests]);

  const handleAccept = useCallback(
    async (requestId: string) => {
      if (!accessToken) return;
      try {
        console.log(`Attempting to accept knock request: ${requestId}`);

        await KnockService.acceptKnock(requestId, accessToken);

        setPendingRequests((prev) => {
          const newRequests = prev.filter((req) => req.id !== requestId);
          if (newRequests.length === 0) {
            router.back();
          }
          return newRequests;
        });

        showToast("success", "Knock request accepted.");
      } catch (error) {
        console.error(
          `[KnockRequestsScreen] Error accepting knock request ${requestId}:`,
          error
        );
        showToast("error", "Failed to accept knock request.");
      }
    },
    [accessToken, router]
  );

  const handleDecline = useCallback(
    async (requestId: string) => {
      if (!accessToken) return;
      try {
        await KnockService.declineKnock(requestId, accessToken);
        setPendingRequests((prev) => {
          const newRequests = prev.filter((req) => req.id !== requestId);
          if (newRequests.length === 0) {
            router.back();
          }
          return newRequests;
        });
        showToast("success", "Knock request declined.");
      } catch (error) {
        console.error(
          `[KnockRequestsScreen] Error declining knock request ${requestId}:`,
          error
        );
        showToast("error", "Failed to decline knock request.");
      }
    },
    [accessToken, router]
  );

  const renderRequestItem = ({ item }: { item: KnockRequest }) => (
    <ThemedView style={[styles.requestItem]}>
      <UserAvatar
        imageUri={getUserAvatar({
          avatar: item.user.avatar,
          username: item.user.username,
        })}
        size={50}
        style={styles.requestAvatar}
      />
      <ThemedView style={styles.requestContent}>
        <ThemedText
          style={styles.requestUsername}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.user.username}
        </ThemedText>
        <ThemedText
          style={[styles.requestTimestamp, { color: colors.textDim }]}
        >
          {formatNotificationTimestamp(item.timestamp)} ago
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.requestActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.acceptButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={() => handleAccept(item.id)}
        >
          <ThemedText
            style={[styles.actionButtonText, { color: colors.buttonText }]}
          >
            Accept
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.declineButton,
            { backgroundColor: colors.buttonBackgroundSecondary },
          ]}
          onPress={() => handleDecline(item.id)}
        >
          <ThemedText style={[styles.actionButtonText, { color: colors.text }]}>
            Decline
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton />}
          title="Knock Requests"
          showBottomBorder={true}
        />

        {loading && !refreshing ? (
          <ThemedView style={styles.initialLoadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText type="subtitle" style={{ color: colors.textDim }}>
              Loading requests...
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={pendingRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.requestsListContent}
            ListEmptyComponent={() => (
              <ThemedView style={styles.emptyListContainer}>
                <ThemedText
                  style={{
                    fontSize: 16,
                    textAlign: "center",
                    color: colors.textDim,
                  }}
                >
                  No new knock requests.
                </ThemedText>
              </ThemedView>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  initialLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    backgroundColor: "transparent",
  },
  requestsListContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexGrow: 1,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 5,
    borderRadius: 8,
  },
  requestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 1,
  },
  requestContent: {
    flex: 1,
    justifyContent: "center",
  },
  requestUsername: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 15,
  },
  requestTimestamp: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {},
  declineButton: {},
  actionButtonText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
