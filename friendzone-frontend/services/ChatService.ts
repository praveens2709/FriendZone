import httpClient from "../configs/axios.config";
import { _get, _post, _put, _delete } from "../configs/api-methods.config";

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

export interface GroupMember {
  id: string;
  firstName: string;
  lastName?: string;
  profileImage: string | null;
  isAdmin: boolean;
}

export interface GroupInfo {
  id: string;
  name: string;
  avatar: string | null;
  adminId: string | null;
  isAdmin: boolean;
  members: GroupMember[];
}

export interface MessageResponse {
  id: string;
  sender: string;
  type?: "user" | "system";
  text?: string;
  attachments?: Attachment[];
  timestamp: string;
  read: boolean;
  isTemp?: boolean;
  replyTo?: ReplyToMessage | null;
  reactions?: MessageReaction[];
  editedAt?: string | null;
}

export interface MessageReaction {
  user: string;
  emoji: string;
}

export interface GetMessagesResponse {
  messages: MessageResponse[];
  currentPage: number;
  totalPages: number;
  totalMessages: number;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
  isLockedIn: boolean;
  otherVibe?: { kind: string; note?: string; expiresAt: string } | null;
  chatType?: "private" | "group";
  chatName?: string | null;
  chatAvatar?: string | null;
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
  reactions?: MessageReaction[];
  editedAt?: string | null;
}

interface RawApiGetMessagesResponse {
  messages: RawApiMessage[];
  currentPage: number;
  totalPages: number;
  totalMessages: number;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
  isLockedIn: boolean;
  otherVibe?: { kind: string; note?: string; expiresAt: string } | null;
  chatType?: "private" | "group";
  chatName?: string | null;
  chatAvatar?: string | null;
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
            type: (msg as any).type === "system" ? "system" : "user",
            text: msg.text,
            attachments: msg.attachments,
            timestamp: msg.timestamp || new Date().toISOString(),
            read: msg.read ?? false,
            isTemp: false,
            replyTo: msg.replyTo || null,
            reactions: msg.reactions || [],
            editedAt: msg.editedAt || null,
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
        otherVibe: data.otherVibe,
        chatType: data.chatType,
        chatName: data.chatName,
        chatAvatar: data.chatAvatar,
      };
    } catch (error: any) {
      throw error;
    }
  }

  static async getUnreadChatIds(): Promise<string[]> {
    const response = await httpClient.get("chats/unread-count");
    return response.data.chatIds || [];
  }

  static async getGroupInfo(chatId: string): Promise<GroupInfo> {
    const response = await httpClient.get(`chats/${chatId}/info`);
    return response.data;
  }

  static async renameGroup(chatId: string, name: string): Promise<void> {
    await httpClient.put(`chats/${chatId}/group`, { name });
  }

  static async updateGroupAvatar(chatId: string, uri: string): Promise<string> {
    const ext = (uri.split(".").pop() || "jpeg").toLowerCase().split("?")[0];
    const form = new FormData();
    form.append("avatar", {
      uri,
      name: `group.${ext}`,
      type: `image/${ext === "jpg" ? "jpeg" : ext}`,
    } as any);
    const response = await httpClient.put(`chats/${chatId}/avatar`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.avatar;
  }

  static async addGroupMembers(chatId: string, userIds: string[]): Promise<void> {
    await httpClient.post(`chats/${chatId}/members`, { userIds });
  }

  static async removeGroupMember(chatId: string, userId: string): Promise<void> {
    await httpClient.delete(`chats/${chatId}/members/${userId}`);
  }

  static async leaveGroup(chatId: string): Promise<void> {
    await httpClient.post(`chats/${chatId}/leave`, {});
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

  static async editMessage(
    token: string,
    messageId: string,
    text: string
  ): Promise<{ messageId: string; text: string; editedAt: string }> {
    return await _put("chats/message/edit", { messageId, text }, token);
  }

  static async reactToMessage(
    token: string,
    messageId: string,
    emoji: string
  ): Promise<{ messageId: string; reactions: MessageReaction[] }> {
    return await _post("chats/message/react", { messageId, emoji }, token);
  }
}

export default ChatService;