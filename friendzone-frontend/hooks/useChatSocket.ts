import { useEffect } from 'react';
import { ChatPreviewResponse } from '@/services/ChatService';
import { Socket } from 'socket.io-client';
import { parseDateString } from '@/constants/Functions';

export const useChatSocket = (
  socket: Socket | null,
  filterValidChats: (chats: ChatPreviewResponse[]) => ChatPreviewResponse[],
  setChats: React.Dispatch<React.SetStateAction<ChatPreviewResponse[]>>
) => {
  useEffect(() => {
    if (!socket) return;

    const sortChats = (chats: ChatPreviewResponse[]) =>
      chats.sort((a, b) => {
        const dateA = parseDateString(a.timestamp);
        const dateB = parseDateString(b.timestamp);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      });

    const handleNewChat = (newChat: ChatPreviewResponse) => {
      if (filterValidChats([newChat]).length > 0) {
        setChats(prev => {
          const index = prev.findIndex(c => c.id === newChat.id);
          const updated = index !== -1 ? [...prev.slice(0, index), newChat, ...prev.slice(index + 1)] : [newChat, ...prev];
          return sortChats(updated);
        });
      } else {
        setChats(prev => prev.filter(c => c.id !== newChat.id));
      }
    };

    const handleChatPreviewUpdate = (data: {
      chatId: string, lastMessage: string, timestamp: string, unreadCount: number, isRestricted?: boolean, firstMessageByKnockerId?: string | null
    }) => {
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.id === data.chatId
            ? {
                ...chat,
                lastMessage: data.lastMessage,
                timestamp: data.timestamp,
                unreadCount: data.unreadCount,
                isRestricted: data.isRestricted ?? chat.isRestricted,
                firstMessageByKnockerId: data.firstMessageByKnockerId ?? chat.firstMessageByKnockerId,
              }
            : chat
        );
        return sortChats(updated);
      });
    };

    socket.on('newChat', handleNewChat);
    socket.on('chatPreviewUpdate', handleChatPreviewUpdate);
    socket.on('chatCreatedConfirmation', handleNewChat);

    return () => {
      socket.off('newChat', handleNewChat);
      socket.off('chatPreviewUpdate', handleChatPreviewUpdate);
      socket.off('chatCreatedConfirmation', handleNewChat);
    };
  }, [socket, filterValidChats, setChats]);
};
