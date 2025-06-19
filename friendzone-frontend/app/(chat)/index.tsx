import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  View,
  Image,
  TextInput,
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
import { mockChatPreviews, ChatPreview } from '@/utils/mockChats';

export default function ChatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = mockChatPreviews.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatItem = ({ item }: { item: ChatPreview }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => {
        router.push(`/(chat)/${item.id}`);
      }}
    >
      <Image source={{ uri: item.avatar }} style={[styles.chatAvatar, {borderColor: colors.border}]} />
      <View style={styles.chatContent}>
        <ThemedText style={styles.chatName}>{item.name}</ThemedText>
        <ThemedText numberOfLines={1} style={[styles.chatLastMessage, { color: colors.textDim }]}>
          {item.lastMessage}
        </ThemedText>
      </View>
      <View style={styles.chatMeta}>
        <ThemedText style={[styles.chatTimestamp, { color: colors.textDim }]}>
          {item.timestamp}
        </ThemedText>
        {item.unreadCount && item.unreadCount > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <ThemedText style={[styles.unreadText, {color: colors.buttonText}]}>{item.unreadCount}</ThemedText>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

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
            <TouchableOpacity style={styles.iconButton} onPress={() => { /* Handle new chat */ }}>
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
                No chats found.
              </ThemedText>
            </ThemedView>
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
    paddingBottom: 10,
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
    paddingVertical: 50,
    backgroundColor: 'transparent',
  },
});