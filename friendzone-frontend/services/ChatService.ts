import { _get, _post } from "../configs/api-methods.config";

export interface ChatPreviewResponse {
  id: string;
  name: string;
  avatar: string | null;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  type: "private" | "group";
  otherParticipantId: string | null;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
}

export interface GetChatsResponse {
  chats: ChatPreviewResponse[];
  currentPage: number;
  totalPages: number;
  totalChats: number;
}

export interface MessageResponse {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  read: boolean;
  isTemp?: boolean;
}

export interface GetMessagesResponse {
  messages: MessageResponse[];
  currentPage: number;
  totalPages: number;
  totalMessages: number;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
}

interface RawApiMessage {
  id: string;
  chat: string;
  sender: string;
  text: string;
  readBy?: string[];
  timestamp: string;
  updatedAt: string;
  __v: number;
  read?: boolean;
}

interface RawApiGetMessagesResponse {
  messages: RawApiMessage[];
  currentPage: number;
  totalPages: number;
  totalMessages: number;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
}

export interface CreateChatResponse {
  message: string;
  chatId: string;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
}

export interface ChatDetailsResponse {
  id: string;
  name: string;
  avatar: string | null;
  participants: {
    _id: string;
    firstName: string;
    lastName?: string;
    profileImage?: string;
  }[];
  type: "private" | "group";
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
}

class ChatService {
  static async getUserChats(
    token: string,
    page: number = 1,
    limit: number = 10
  ): Promise<GetChatsResponse> {
    try {
      const data: GetChatsResponse = await _get(
        `chats?page=${page}&limit=${limit}`,
        token
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  }

  static async getChatMessages(
    chatId: string,
    token: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<GetMessagesResponse> {
    try {
      const data: RawApiGetMessagesResponse = await _get(
        `chats/${chatId}/messages?page=${page}&limit=${limit}`,
        token
      );

      if (!data.messages || !Array.isArray(data.messages)) {
        return {
          messages: [],
          currentPage: data.currentPage || 1,
          totalPages: data.totalPages || 0,
          totalMessages: data.totalMessages || 0,
          isRestricted: data.isRestricted || false,
          firstMessageByKnockerId: data.firstMessageByKnockerId || null,
        };
      }

      const formattedMessages: MessageResponse[] = data.messages.map(
        (msg: RawApiMessage) => {
          return {
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            timestamp: msg.timestamp || new Date().toISOString(),
            read: msg.read ?? false,
            isTemp: false,
          };
        }
      );

      return {
        messages: formattedMessages,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        totalMessages: data.totalMessages,
        isRestricted: data.isRestricted,
        firstMessageByKnockerId: data.firstMessageByKnockerId,
      };
    } catch (error: any) {
      throw error;
    }
  }

  static async getChatDetails(
    chatId: string,
    token: string
  ): Promise<ChatDetailsResponse> {
    return await _get(`chats/${chatId}`, token);
  }

  static async createChat(
    token: string,
    recipientId: string
  ): Promise<CreateChatResponse> {
    return await _post("chats", { recipientId }, token);
  }

  static async markMessagesAsRead(
    chatId: string,
    token: string
  ): Promise<void> {
    try {
      await _post(`chats/${chatId}/read`, {}, token);
    } catch (error: any) {
      console.error("Failed to mark messages as read:", error);
    }
  }
}

export default ChatService;