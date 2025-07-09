// app/(chat)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  View,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CommonHeader from '@/components/CommonHeader';
import ThemedSafeArea from '@/components/ThemedSafeArea';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import ChatService, { ChatPreviewResponse } from '@/services/ChatService';

export default function ChatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { socket } = useSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatPreviewResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChats = useCallback(async (pageNum: number, initialLoad: boolean = false) => {
    if (!accessToken) {
      if (initialLoad) setIsLoading(false);
      return;
    }

    if (initialLoad) {
      setIsLoading(true);
    }
    try {
      const response = await ChatService.getUserChats(accessToken, pageNum);
      if (pageNum === 1) {
        setChats(response.chats);
      } else {
        setChats(prevChats => {
          const newChats = response.chats.filter(newChat => !prevChats.some(prevChat => prevChat.id === newChat.id));
          return [...prevChats, ...newChats];
        });
      }
      setTotalPages(response.totalPages);
      setHasMoreChats(response.chats.length > 0 && pageNum < response.totalPages);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      setHasMoreChats(false);
    } finally {
      if (initialLoad) {
        setIsLoading(false);
      }
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    setChats([]);
    setPage(1);
    setTotalPages(1);
    setHasMoreChats(true);
    fetchChats(1, true);
  }, [accessToken, fetchChats]);

  useEffect(() => {
    if (socket) {
      const handleChatPreviewUpdate = ({ chatId, lastMessage, timestamp, unreadCountChange, senderName }: { chatId: string, lastMessage: string, timestamp: string, unreadCountChange: number, senderName: string }) => {
        setChats(prevChats => {
          const updatedChats = prevChats.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                lastMessage: `${senderName}: ${lastMessage}`,
                timestamp: timestamp,
                unreadCount: (chat.unreadCount || 0) + unreadCountChange,
              };
            }
            return chat;
          });
          return updatedChats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        });
      };

      socket.on('chatPreviewUpdate', handleChatPreviewUpdate);

      return () => {
        socket.off('chatPreviewUpdate', handleChatPreviewUpdate);
      };
    }
  }, [socket]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMoreChats(true);
    fetchChats(1);
  }, [fetchChats]);

  const handleLoadMore = () => {
    if (page < totalPages && !refreshing && !isLoading) {
      setPage(prevPage => prevPage + 1);
      fetchChats(page + 1);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatItem = ({ item }: { item: ChatPreviewResponse }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => {
        router.push({
          pathname: '/(chat)/[id]',
          params: {
            id: item.id,
            chatName: item.name,
            chatAvatar: item.avatar || `https://ui-avatars.com/api/?name=${item.name.replace(/\s/g, '+')}`,
          },
        });
      }}
    >
      <Image source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${item.name.replace(/\s/g, '+')}` }} style={[styles.chatAvatar, {borderColor: colors.border}]} />
      <View style={styles.chatContent}>
        <ThemedText style={styles.chatName}>{item.name}</ThemedText>
        <ThemedText numberOfLines={1} style={[styles.chatLastMessage, { color: colors.textDim }]}>
          {item.lastMessage}
        </ThemedText>
      </View>
      <View style={styles.chatMeta}>
        <ThemedText style={[styles.chatTimestamp, { color: colors.textDim }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
        {item.unreadCount && item.unreadCount > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <ThemedText style={[styles.unreadText, {color: colors.buttonText}]}>{item.unreadCount}</ThemedText>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader
            leftContent={<BackButton color={colors.text}/>}
            title="Chats"
            rightContent1={
              <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
                <MaterialCommunityIcons name="circle-edit-outline" size={28} color={colors.text} />
              </TouchableOpacity>
            }
            showBottomBorder={true}
          />
          <ThemedView style={styles.initialLoadingContainer}>
            <ActivityIndicator size="large" color={colors.text} /> 
            <ThemedText style={{ color: colors.textDim, marginTop: 10 }}>Loading chats...</ThemedText>
          </ThemedView>
        </ThemedSafeArea>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={colors.gradient}
      style={styles.gradientContainer}
    >
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton color={colors.text}/>}
          title="Chats"
          rightContent1={
            <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
              <MaterialCommunityIcons name="circle-edit-outline" size={28} color={colors.text} />
            </TouchableOpacity>
          }
          showBottomBorder={true}
        />

        <View style={[styles.searchContainer, { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border }]}>
          <Feather name="search" size={20} color={colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, backgroundColor: colors.buttonBackgroundSecondary }]}
            placeholder="Search chats"
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatListContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          ListEmptyComponent={() => (
            <ThemedView style={styles.emptyListContainer}>
              <ThemedText style={{ fontSize: 16, textAlign: 'center', color: colors.textDim }}>
                No chats found. Start a new conversation!
              </ThemedText>
            </ThemedView>
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={() => (
            !isLoading && page < totalPages && !refreshing && (
              <View style={styles.loadingMoreContainer}>
                <ThemedText style={{ color: colors.textDim }}>Loading more chats...</ThemedText>
              </View>
            )
          )}
        />
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
    backgroundColor: 'transparent',
  },
  iconButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    lineHeight: 18
  },
  chatListContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 1,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  chatLastMessage: {
    fontSize: 14,
  },
  chatMeta: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  chatTimestamp: {
    fontSize: 12,
    marginBottom: 4,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: -1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 15,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  loadingMoreContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  initialLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});