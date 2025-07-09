import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  View,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
import { useAuth } from '@/context/AuthContext';
import { formatNotificationTimestamp } from "@/constants/Functions";

export default function KnockRequestsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [pendingRequests, setPendingRequests] = useState<KnockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingRequests = useCallback(async (isRefreshing: boolean = false) => {
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
      const requests = await KnockService.getKnockers(accessToken);
      setPendingRequests(requests);
    } catch (error) {
      console.error("[KnockRequestsScreen] Error fetching knock requests:", error);
      Alert.alert("Error", "Failed to load knock requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const onRefresh = useCallback(() => {
    fetchPendingRequests(true);
  }, [fetchPendingRequests]);

const handleAccept = useCallback(async (requestId: string) => {
  if (!accessToken) return;
  try {
    console.log(`Attempting to accept knock request: ${requestId}`);
    
    // Call KnockService to accept the knock and update the status to 'onesidedlock'
    await KnockService.acceptKnock(requestId, accessToken);  // Use acceptKnock here to handle acceptance

    // Update local state to remove the accepted request
    setPendingRequests((prev) => {
      const newRequests = prev.filter((req) => req.id !== requestId);
      if (newRequests.length === 0) {
        router.back(); // Navigate back if no more requests
      }
      return newRequests;
    });

    Alert.alert("Success", "Knock request accepted.");
  } catch (error) {
    console.error(`[KnockRequestsScreen] Error accepting knock request ${requestId}:`, error);
    Alert.alert("Error", "Failed to accept knock request.");
  }
}, [accessToken, router]);

  const handleDecline = useCallback(async (requestId: string) => {
    if (!accessToken) return;
    try {
      await KnockService.declineKnock(requestId, accessToken);
      setPendingRequests((prev) => {
        const newRequests = prev.filter((req) => req.id !== requestId);
        if (newRequests.length === 0) {
          // If no more requests, navigate back
          router.back(); // or router.push('/(tabs)/notifications');
        }
        return newRequests;
      });
      Alert.alert("Success", "Knock request declined.");
    } catch (error) {
      console.error(`[KnockRequestsScreen] Error declining knock request ${requestId}:`, error);
      Alert.alert("Error", "Failed to decline knock request.");
    }
  }, [accessToken, router]); // Add router to dependencies

  const renderRequestItem = ({ item }: { item: KnockRequest }) => (
    <View style={[styles.requestItem]}>
      <Image
        source={{ uri: item.user.avatar || `https://ui-avatars.com/api/?name=${item.user.username.replace(/\s/g, '+')}` }}
        style={[styles.requestAvatar, { borderColor: colors.border }]}
      />
      <View style={styles.requestContent}>
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
      </View>
      <View style={styles.requestActions}>
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
      </View>
    </View>
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
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={{ color: colors.textDim, marginTop: 10 }}>Loading requests...</ThemedText>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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