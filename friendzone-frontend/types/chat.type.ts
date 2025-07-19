export interface ChatPreview {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  type: 'private' | 'group';
  otherParticipantId?: string;
  isRestricted: boolean;
  firstMessageByKnockerId: string | null;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  read: boolean;
  isTemp?: boolean;
}

export interface DisplayUser {
  id: string;
  username: string;
  avatar: string | null;
  status?: 'pending' | 'lockedIn' | 'onesidedlock' | 'declined';
  relationToMe?: 'knocker' | 'knocked' | 'lockedIn' | 'stranger';
  isCreatingChat?: boolean;
}
