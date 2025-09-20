import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Platform,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import ThemedSafeArea from '@/components/ThemedSafeArea';
import CommonHeader from '@/components/CommonHeader';
import BackButton from '@/components/BackButton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import UserProfileCard from '@/components/UserProfileCard';
import KnockService from '@/services/knockService';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import Button from "@/components/Button";
import GameService from '@/services/GameService';

interface FriendData {
  id: string;
  username: string;
  avatar: string | null;
}

interface SendInviteResponse {
  message: string;
  gameSessionId: string;
}

const OVERLAY_PRIMARY_TEXT_COLOR = '#FFFFFF';
const OVERLAY_DIM_TEXT_COLOR = 'rgba(255,255,255,0.7)';

export default function InviteFriendsToGameScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{
    gameId: string;
    gameName: string;
    gameImage: any;
    minPlayers: string;
    maxPlayers: string;
  }>();

  const { gameId, gameName, gameImage } = params;
  const minPlayers = parseInt(params.minPlayers || "1", 10);
  const maxPlayers = parseInt(params.maxPlayers || "1", 10);

  const isMultiplayerGame = maxPlayers > 1;
  const isOneToOneGame = minPlayers === 2 && maxPlayers === 2;
  const isSinglePlayerGame = minPlayers === 1 && maxPlayers === 1;

  const [allFriends, setAllFriends] = useState<FriendData[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!gameId || !gameName || isNaN(minPlayers) || isNaN(maxPlayers)) {
      router.back();
      console.log('error', 'Game details not found or invalid player count.');
      return;
    }

    const fetchLockedInFriends = async () => {
      if (!accessToken) return;
      setLoadingFriends(true);
      try {
        const myKnockers = await KnockService.getKnockers(accessToken);
        const myKnocked = await KnockService.getKnocked(accessToken);

        const allFriendsMap = new Map<string, FriendData>();

        myKnockers.forEach((k) => {
          if (k.status === 'lockedIn') {
            allFriendsMap.set(k.user.id, {
              id: k.user.id,
              username: k.user.username,
              avatar: k.user.avatar,
            });
          }
        });
        myKnocked.forEach((k) => {
          if (k.status === 'lockedIn') {
            allFriendsMap.set(k.user.id, {
              id: k.user.id,
              username: k.user.username,
              avatar: k.user.avatar,
            });
          }
        });

        setAllFriends(Array.from(allFriendsMap.values()));
      } catch (error) {
        console.error("Failed to fetch locked-in friends:", error);
        console.log('error', 'Failed to load friends.');
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchLockedInFriends();
  }, [accessToken, gameId, gameName, minPlayers, maxPlayers]);

  const toggleFriendSelection = useCallback(
    (friendId: string) => {
      setSelectedFriendIds((prevSelected) => {
        const newSelected = new Set(prevSelected);

        if (isOneToOneGame) {
          if (newSelected.has(friendId)) {
            newSelected.delete(friendId);
          } else {
            newSelected.clear();
            newSelected.add(friendId);
          }
        } else {
          if (newSelected.has(friendId)) {
            newSelected.delete(friendId);
          } else {
            if (newSelected.size < maxPlayers - 1) {
              newSelected.add(friendId);
            } else {
              console.log(
                'info',
                `Cannot select more than ${maxPlayers - 1} opponent(s) for this game.`
              );
            }
          }
        }

        return newSelected;
      });
    },
    [isOneToOneGame, maxPlayers]
  );

  const filteredFriends = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase(); 
    if (!searchQuery) return allFriends;
    return allFriends.filter((friend) =>
      friend.username.toLowerCase().includes(lowerCaseQuery)
    );
  }, [allFriends, searchQuery]);

  const handleSendInvite = async () => {
    const numSelected = selectedFriendIds.size;
    const requiredOpponents = isSinglePlayerGame ? 0 : minPlayers - 1;

    if (!accessToken) {
      console.log('error', 'Authentication required to send invite.');
      return;
    }

    if (numSelected < requiredOpponents) {
      console.log(
        'Insufficient Players',
        `Please select at least ${requiredOpponents} opponent(s) for this game.`
      );
      return;
    }
    if (!isSinglePlayerGame && numSelected > maxPlayers - 1) {
      console.log(
        'Too Many Players',
        `You can select at most ${maxPlayers - 1} opponent(s) for this game.`
      );
      return;
    }

    setSendingInvite(true);
    try {
      const response: SendInviteResponse = await GameService.sendGameInvite(accessToken, gameId, Array.from(selectedFriendIds));

      console.log('success', `Invite sent for ${gameName}!`);
      router.push({
        pathname: '/games/[id]',
        params: { id: response.gameSessionId, gameId: gameId }
      });

    } catch (error: any) {
      console.error("Failed to send game invite:", error);
      console.log('error', error.response?.data?.message || 'Failed to send invite.');
    } finally {
      setSendingInvite(false);
    }
  };

  const renderFriendItem = ({ item }: { item: FriendData }) => {
    const isSelected = selectedFriendIds.has(item.id);
    const selectionIcon = isOneToOneGame
      ? (isSelected ? 'radio-button-on' : 'radio-button-off')
      : (isSelected ? 'checkbox-outline' : 'square-outline');

    return (
      <UserProfileCard
        userId={item.id}
        username={item.username}
        avatar={item.avatar}
        description={isSelected ? 'Selected' : 'Tap to select'}
        onPress={() => toggleFriendSelection(item.id)}
        usernameColor={OVERLAY_PRIMARY_TEXT_COLOR}
        descriptionColor={OVERLAY_DIM_TEXT_COLOR}
        rightActionComponent={
          <Ionicons
            name={selectionIcon}
            size={24}
            color={isSelected ? colors.primary : OVERLAY_DIM_TEXT_COLOR}
          />
        }
      />
    );
  };

  return (
    <ImageBackground source={gameImage} style={styles.backgroundImage}>
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', colors.backgroundSecondary]}
        style={styles.fullScreenOverlay}
      >
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader
            leftContent={<BackButton color={OVERLAY_PRIMARY_TEXT_COLOR}/>}
            title={gameName}
            titleColor={OVERLAY_PRIMARY_TEXT_COLOR}
            showBottomBorder={true}
          />

          {isSinglePlayerGame ? (
            <ThemedView style={styles.singlePlayerMessage}>
              <ThemedText
                style={[styles.singlePlayerText, { color: OVERLAY_PRIMARY_TEXT_COLOR }]}
              >
                This is a single player game. You can start playing directly!
              </ThemedText>
              <Button
                title="Play"
                onPress={() =>
                  console.log('info', `Starting solo ${gameName}! (Mock)`)
                }
                style={styles.startSoloGameButton}
                textStyle={styles.startSoloGameButtonText}
              />
            </ThemedView>
          ) : (
            <>
              <ThemedView
                style={[
                  styles.searchBarContainer,
                  {
                    backgroundColor: colors.buttonBackgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather
                  name="search"
                  size={20}
                  color={colors.textDim}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search friends"
                  placeholderTextColor={colors.textDim}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
              </ThemedView>

              <ThemedView style={styles.friendsListHeader}>
                <ThemedText style={[styles.friendsListTitle, {color: OVERLAY_PRIMARY_TEXT_COLOR}]}>
                  Locked-In Friends
                </ThemedText>
                <ThemedText
                  style={[styles.selectedCount, { color: OVERLAY_DIM_TEXT_COLOR }]}
                >
                  {selectedFriendIds.size} /{' '}
                  {isOneToOneGame ? '1' : `${maxPlayers - 1}`} selected
                </ThemedText>
              </ThemedView>

              {loadingFriends ? (
                <ThemedView style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <ThemedText
                    style={[styles.loadingText, { color: OVERLAY_PRIMARY_TEXT_COLOR }]}
                  >
                    Loading friends...
                  </ThemedText>
                </ThemedView>
              ) : (
                <FlatList
                  data={filteredFriends}
                  renderItem={renderFriendItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.friendsListContent}
                  ListEmptyComponent={() => (
                    <ThemedView style={styles.emptyListContainer}>
                      <ThemedText
                        style={[styles.emptyText, { color: OVERLAY_DIM_TEXT_COLOR }]}
                      >
                        {searchQuery
                          ? 'No matching friends found.'
                          : 'No locked-in friends found.'}
                      </ThemedText>
                    </ThemedView>
                  )}
                />
              )}
              <ThemedView style={styles.sendInviteButton}>
                <Button
                  onPress={handleSendInvite}
                  disabled={selectedFriendIds.size === 0 || sendingInvite}
                  title={
                    sendingInvite
                      ? ''
                      : `Send Invite (${selectedFriendIds.size})`
                  }
                  style={[
                    {
                      backgroundColor:
                        selectedFriendIds.size > 0 && !sendingInvite
                          ? colors.primary
                          : colors.buttonBackgroundSecondary,
                      borderColor:
                        selectedFriendIds.size > 0 && !sendingInvite
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  textStyle={{
                    color:
                      selectedFriendIds.size > 0
                        ? colors.buttonText
                        : colors.textDim,
                  }}
                >
                  {sendingInvite && (
                    <ActivityIndicator size="small" color={colors.buttonText} />
                  )}
                </Button>
              </ThemedView>
            </>
          )}
        </ThemedSafeArea>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  fullScreenOverlay: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  friendsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 999
  },
  friendsListTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 14,
  },
  friendsListContent: {
    paddingHorizontal: 5,
    paddingBottom: 20,
    flexGrow: 1,
  },
  sendInviteButton: {
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 70 : 30,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  singlePlayerMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  singlePlayerText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  startSoloGameButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  startSoloGameButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});