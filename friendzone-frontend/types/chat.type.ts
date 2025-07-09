// types/chat.type.ts

export interface ChatPreview {
  id: string;
  name: string;
  avatar: string; // URL
  lastMessage: string;
  timestamp: string; // Human-readable like "2 hours ago"
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'other';
  text: string;
  timestamp: string; // ISO string
  read: boolean;
}