import { _get, _post, _delete } from "../configs/api-methods.config";

export interface LastMessagePreview {
  id: string | null;
  senderId: string | null;
  content: string;
  type: "text" | "image" | "video" | "audio" | string;
  read?: boolean;
}

export interface ChatPreviewResponse {
  id: string;
  name: string;
  avatar: string | null;
  lastMessage: LastMessagePreview;
  timestamp: string;
  unreadCount: number;
  type: "private" | "group";
  otherParticipantId: string | null;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
  isLockedIn: boolean;
}

export interface GetChatsResponse {
  chats: ChatPreviewResponse[];
  currentPage: number;
  totalPages: number;
  totalChats: number;
}

export interface Attachment {
  type: string;
  url: string;
  fileName: string;
  size: number;
  duration?: number;
}

export interface ReplyToMessage {
  id: string;
  text?: string;
  sender?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  attachments?: Attachment[];
}

export interface MessageResponse {
  id: string;
  sender: string;
  text?: string;
  attachments?: Attachment[];
  timestamp: string;
  read: boolean;
  isTemp?: boolean;
  replyTo?: ReplyToMessage | null;
}

export interface GetMessagesResponse {
  messages: MessageResponse[];
  currentPage: number;
  totalPages: number;
  totalMessages: number;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
  isLockedIn: boolean;
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
  attachments?: Attachment[];
  replyTo?: ReplyToMessage | null;
}

interface RawApiGetMessagesResponse {
  messages: RawApiMessage[];
  currentPage: number;
  totalPages: number;
  totalMessages: number;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
  isLockedIn: boolean;
}

export interface CreateChatResponse {
  message: string;
  chatId: string;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
  isLockedIn: boolean;
}

export interface CreateGroupChatResponse {
  message: string;
  chatId: string;
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
  isLockedIn: boolean;
}

export interface DeleteChatsResponse {
    message: string;
    deletedChats: string[];
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
          isLockedIn: data.isLockedIn || false,
        };
      }

      const formattedMessages: MessageResponse[] = data.messages.map(
        (msg: RawApiMessage) => {
          return {
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            attachments: msg.attachments,
            timestamp: msg.timestamp || new Date().toISOString(),
            read: msg.read ?? false,
            isTemp: false,
            replyTo: msg.replyTo || null,
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
        isLockedIn: data.isLockedIn,
      };
    } catch (error: any) {
      throw error;
    }
  }

  static async getChatDetails(
    chatId: string,
    token: string
  ): Promise<ChatDetailsResponse> {
    const data: ChatDetailsResponse = await _get(`chats/${chatId}`, token);
    return data;
  }

  static async createChat(
    token: string,
    recipientId: string
  ): Promise<CreateChatResponse> {
    return await _post("chats", { recipientId }, token);
  }

  static async createGroupChat(
    token: string,
    participants: string[],
    name: string
  ): Promise<CreateGroupChatResponse> {
    const payload = {
      participants,
      name,
    };
    return await _post("chats/group", payload, token);
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

  static async sendMessageWithAttachment(
    token: string,
    chatId: string,
    clientTempId: string,
    files: any[],
    isNewChatFromCreation: boolean,
    replyToId?: string | null,
  ): Promise<MessageResponse> {
    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('clientTempId', clientTempId);
      formData.append('isNewChatFromCreation', isNewChatFromCreation.toString());
      if (replyToId) {
        formData.append('replyToId', replyToId);
      }

      files.forEach((file, index) => {
        formData.append('files', {
          uri: file.uri,
          name: file.name || `file-${index}-${Date.now()}`,
          type: file.mimeType || file.type,
        } as any);

        if (file.durationMillis !== undefined) {
          formData.append(`file_duration_${index}`, file.durationMillis.toString());
        }
      });
      
      const response = await _post<MessageResponse>(
        'chats/send-media', 
        formData, 
        token
      );

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  static async deleteChats(
    token: string,
    chatIds: string[],
    deleteForEveryone: boolean = false
  ): Promise<DeleteChatsResponse> {
    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      throw new Error("Chat IDs must be a non-empty array.");
    }
    return await _post("chats/delete", { chatIds, deleteForEveryone }, token);
  }

  static async deleteMessage(
    token: string,
    messageId: string,
    deleteForEveryone: boolean
  ): Promise<void> {
    if (!messageId) {
      throw new Error("Message ID is required.");
    }
    return await _post("chats/message/delete", { messageId, deleteForEveryone }, token);
  }
}

export default ChatService;