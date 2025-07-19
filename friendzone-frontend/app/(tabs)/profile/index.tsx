import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, TouchableOpacity, View, Platform, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import ThemedModal from "@/components/ThemedModal";
import AuthModalContent from "@/components/AuthModalContent";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import KnockService, { KnockRequest } from "@/services/knockService";
import { categorizeKnocks } from "@/utils/knock-utils";
import { KnockListType } from "@/types/knock.type";
import { useSocket } from "@/context/SocketContext";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, authLoading, signOut, accessToken } = useAuth();
  const { socket } = useSocket();

  const [showMainModal, setShowMainModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);

  const [showAuthFlowModal, setShowAuthFlowModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [knockersCount, setKnockersCount] = useState(0);
  const [knockingCount, setKnockingCount] = useState(0);
  const [lockedInCount, setLockedInCount] = useState(0);

  const [knockersList, setKnockersList] = useState<KnockRequest[]>([]);
  const [knockingList, setKnockingList] = useState<KnockRequest[]>([]);
  const [lockedInList, setLockedInList] = useState<KnockRequest[]>([]);

  const [loadingKnocks, setLoadingKnocks] = useState(true);

  const fetchKnockData = useCallback(async () => {
    if (!user || !accessToken) {
      setLoadingKnocks(false);
      return;
    }

    setLoadingKnocks(true);

    try {
      const [myReceivedKnocks, mySentKnocks] = await Promise.all([
        KnockService.getKnockers(accessToken),
        KnockService.getKnocked(accessToken),
      ]);

      const { knockers, knocking, lockedIn, lockedInCount } = categorizeKnocks(
        myReceivedKnocks,
        mySentKnocks,
        user._id
      );

      setKnockersList(knockers);
      setKnockingList(knocking);
      setLockedInList(lockedIn);

      setKnockersCount(knockers.length);
      setKnockingCount(knocking.length);
      setLockedInCount(lockedInCount);
    } catch (error) {
      console.error("Failed to fetch knock data:", error);
      setKnockersCount(0);
      setKnockingCount(0);
      setLockedInCount(0);
    } finally {
      setLoadingKnocks(false);
    }
  }, [user, accessToken]);

  useEffect(() => {
    fetchKnockData();

    if (socket && user) {
      const handleKnockStatusChange = (data: { userId: string }) => {
        if (data.userId === user._id) {
          fetchKnockData();
        }
      };

      socket.on('knockStatusChanged', handleKnockStatusChange);

      return () => {
        socket.off('knockStatusChanged', handleKnockStatusChange);
      };
    }
  }, [fetchKnockData, socket, user]);

  if (authLoading || loadingKnocks) {
    return (
      <ThemedSafeArea style={styles.centered}>
        <ActivityIndicator size="small" color={colors.text} />
        <ThemedText type="subtitle" style={{ color: colors.textDim }}>
          Loading profile...
        </ThemedText>
      </ThemedSafeArea>
    );
  }

  if (!user) {
    return (
      <ThemedSafeArea style={[styles.centered, styles.safeAreaTransparentBg]}>
        <ThemedText type="title">Couldn’t load your profile</ThemedText>
        <ThemedText type="default" style={{ color: colors.textDim }}>
          Please try again later.
        </ThemedText>
      </ThemedSafeArea>
    );
  }

  const closeAuthFlowModal = () => {
    setShowAuthFlowModal(false);
    setAuthMode("login");
  };

  const navigateToKnockList = (type: KnockListType, data: KnockRequest[]) => {
    router.push({
      pathname: "/profile/knock-list",
      params: {
        listType: type,
        data: JSON.stringify(data),
      },
    });
  };

  const renderStatItem = (
    label: string,
    count: number,
    list: KnockRequest[],
    type: KnockListType
  ) => (
    <TouchableOpacity
      key={type}
      style={styles.statItem}
      onPress={() => navigateToKnockList(type, list)}
    >
      <ThemedText
        type="subtitle"
        style={[styles.statNumber, { color: colors.textDim }]}
      >
        {count}
      </ThemedText>
      <ThemedText
        type="default"
        style={[styles.statLabel, { color: colors.text }]}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ThemedSafeArea style={styles.safeAreaTransparentBg}>
        <CommonHeader
          leftContent={
            <TouchableOpacity
              style={styles.userHeader}
              onPress={() => setShowMainModal(true)}
            >
              <Feather
                name="lock"
                size={18}
                color={colors.text}
                style={{ marginRight: 5 }}
              />
              <ThemedText style={styles.username}>{user.firstName}</ThemedText>
              <FontAwesome5
                name="chevron-down"
                size={14}
                color={colors.text}
                style={{ marginLeft: 5 }}
              />
            </TouchableOpacity>
          }
          rightContent1={
            <TouchableOpacity onPress={() => router.push("/profile/settings")}>
              <Ionicons name="menu" size={28} color={colors.text} />
            </TouchableOpacity>
          }
          showBottomBorder={true}
        />
        <ThemedView style={styles.profileInfoContainer}>
          <UserAvatar imageUri={user.profileImage} size={100} />
          <ThemedText type="title" style={styles.fullName}>
            {user.firstName} {user.lastName}
          </ThemedText>
          {user.bio && (
            <ThemedText
              type="default"
              style={[styles.bio, { color: colors.textDim }]}
            >
              {user.bio}
            </ThemedText>
          )}

          <ThemedView style={styles.knockStatsContainer}>
            {renderStatItem(
              "Knockers",
              knockersCount,
              knockersList,
              KnockListType.Knockers
            )}
            {renderStatItem(
              "Knocking",
              knockingCount,
              knockingList,
              KnockListType.Knocking
            )}
            {renderStatItem(
              "LockedIn",
              lockedInCount,
              lockedInList,
              KnockListType.LockedIn
            )}
          </ThemedView>

          <Button
            title="Edit Profile"
            onPress={() => router.push("/profile/settings")}
            style={styles.editProfileButton}
          />
        </ThemedView>
      </ThemedSafeArea>
      <ThemedModal
        visible={showMainModal}
        onClose={() => setShowMainModal(false)}
      >
        <ThemedView style={[styles.mainModal, { borderColor: colors.border }]}>
          <TouchableOpacity style={styles.modalItem} onPress={() => {}}>
            <UserAvatar imageUri={user.profileImage} size={42} />
            <ThemedView style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: colors.textSecondary }}
              >
                {user.firstName} {user.lastName}
              </ThemedText>
            </ThemedView>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <ThemedView style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              setShowMainModal(false);
              setShowAddAccountModal(true);
            }}
          >
            <ThemedView
              style={[
                styles.iconCircle,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.textSecondary,
                },
              ]}
            >
              <Ionicons name="add" size={28} color={colors.textSecondary} />
            </ThemedView>
            <ThemedText
              type="defaultSemiBold"
              style={{ marginLeft: 10, color: colors.textSecondary }}
            >
              Add FriendZone Account
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView
          style={{
            marginTop: 20,
            marginBottom: Platform.OS === "ios" ? 10 : 40,
          }}
        >
          <Button
            title="Sign Out"
            onPress={() => {
              setShowMainModal(false);
              setShowLogoutConfirmModal(true);
            }}
          />
        </ThemedView>
      </ThemedModal>
      <ThemedModal
        visible={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalItemCentered, { borderColor: colors.border }]}
          onPress={() => {
            setShowAddAccountModal(false);
            setAuthMode("login");
            setShowAuthFlowModal(true);
          }}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ color: colors.textSecondary }}
          >
            Login to existing account
          </ThemedText>
        </TouchableOpacity>

        <ThemedView style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity
          style={[styles.modalItemCentered, { borderColor: colors.border }]}
          onPress={() => {
            setShowAddAccountModal(false);
            setAuthMode("signup");
            setShowAuthFlowModal(true);
          }}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{
              color: colors.textSecondary,
              marginBottom: Platform.OS === "ios" ? 20 : 40,
            }}
          >
            Create a new account
          </ThemedText>
        </TouchableOpacity>
      </ThemedModal>
      <ThemedModal
        visible={showAuthFlowModal}
        onClose={closeAuthFlowModal}
        fullHeight={true}
        containerStyle={styles.authModalContainerStyle}
      >
        <AuthModalContent
          initialMode={authMode}
          onCloseModal={closeAuthFlowModal}
        />
      </ThemedModal>
      <ThemedModal
        visible={showLogoutConfirmModal}
        onClose={() => setShowLogoutConfirmModal(false)}
      >
        <ThemedText
          type="subtitle"
          style={{
            textAlign: "center",
            marginBottom: 25,
            color: colors.textSecondary,
          }}
        >
          Are you sure you want to sign out?
        </ThemedText>

        <ThemedView style={styles.buttonRow}>
          <Button
            title="Cancel"
            onPress={() => setShowLogoutConfirmModal(false)}
            style={[styles.button, { marginRight: 8 }]}
          />
          <Button title="OK" onPress={signOut} style={styles.button} />
        </ThemedView>
      </ThemedModal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeAreaTransparentBg: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
  },
  profileInfoContainer: {
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    marginBottom: 5,
    paddingHorizontal: 20,
  },
  fullName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  bio: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  editProfileButton: {},
  mainModal: {
    borderWidth: 1,
    borderRadius: 14,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  modalItemCentered: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  authModalContainerStyle: {
    borderRadius: 20,
    marginTop: 120,
    flexGrow: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: Platform.OS === "ios" ? 20 : 40,
  },
  button: {
    flex: 1,
  },
  knockStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 10,
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
  },
});