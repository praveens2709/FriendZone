// services/chatService.ts (Updated)
import { _get, _post } from "../configs/api-methods.config";

export interface ChatPreviewResponse {
  id: string;
  name: string;
  avatar: string | null;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  type: 'private' | 'group';
  otherParticipantId?: string;
}

export interface GetChatsResponse {
  chats: ChatPreviewResponse[];
  currentPage: number;
  totalPages: number;
  totalChats: number;
}

export interface MessageResponse {
  id: string;
  sender: string; // Changed to string to store actual sender ID
  text: string;
  timestamp: string;
  read: boolean;
}

export interface GetMessagesResponse {
  messages: MessageResponse[];
  currentPage: number;
  totalPages: number;
  totalMessages: number;
}

// Define the expected structure of a raw message from the API before formatting
interface RawApiMessage {
  _id: string;
  sender: { _id: string; [key: string]: any }; // Assuming sender is an object with an _id
  text: string;
  createdAt: string; // Assuming timestamp is named 'createdAt' from backend
  readBy: string[]; // Assuming readBy is an array of user IDs
  [key: string]: any; // Allow other properties
}

// Define the expected structure of the raw API response for messages
interface RawApiGetMessagesResponse {
  messages: RawApiMessage[];
  currentPage: number;
  totalPages: number;
  totalMessages: number;
  [key: string]: any; // Allow other properties
}

export interface CreateChatResponse {
  message: string;
  chatId: string;
}

export interface ChatDetailsResponse {
  id: string;
  name: string;
  avatar: string | null;
  participants: { _id: string; firstName: string; lastName?: string; profileImage?: string; }[];
  type: 'private' | 'group';
}

class ChatService {
  static async getUserChats(token: string, page: number = 1, limit: number = 10): Promise<GetChatsResponse> {
    return await _get(`chats?page=${page}&limit=${limit}`, token);
  }

  static async getChatMessages(chatId: string, token: string, page: number = 1, limit: number = 20): Promise<GetMessagesResponse> {
    const data: RawApiGetMessagesResponse = await _get(`chats/${chatId}/messages?page=${page}&limit=${limit}`, token);
    
    const formattedMessages: MessageResponse[] = data.messages.map((msg: RawApiMessage) => ({
        id: msg._id,
        sender: msg.sender._id, // This will be compared to current user._id in component
        text: msg.text,
        timestamp: msg.createdAt, // Assuming your backend returns 'createdAt' for message timestamp
        read: msg.readBy && msg.readBy.length > 0 ? true : false,
    }));
    
    return {
        messages: formattedMessages,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        totalMessages: data.totalMessages,
    };
  }

  static async getChatDetails(chatId: string, token: string): Promise<ChatDetailsResponse> {
    return await _get(`chats/${chatId}`, token);
  }

  static async createChat(token: string, recipientId: string): Promise<CreateChatResponse> {
    return await _post('chats', { recipientId }, token);
  }
}

export default ChatService;