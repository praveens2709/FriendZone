import Toast, {ToastType} from 'react-native-toast-message';
import {Keyboard, NativeSyntheticEvent, TextInput, TextInputKeyPressEventData} from 'react-native';
import { DisplayUser } from '@/types/chat.type';
import { format } from 'date-fns';
import { ChatPreviewResponse } from '@/services/ChatService';

export const showToast = (type: ToastType, message: string) => {
  Toast.show({
    type,
    text1: message,
  });
};

export function HandleApiError(error: unknown) {
}

export const OTP_LENGTH = 4;

export const handleInputChange = (
  text: string,
  index: number,
  code: string[],
  setCode: (code: string[]) => void,
  inputs: React.MutableRefObject<(TextInput | null)[]>,
) => {
  const updatedCode = [...code];

  if (/^\d$/.test(text)) {
    updatedCode[index] = text;
    setCode(updatedCode);

    if (index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    } else {
      Keyboard.dismiss();
    }
  }
};

export const handleBackspace = (
  event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  index: number,
  code: string[],
  setCode: (code: string[]) => void,
  inputs: React.MutableRefObject<(TextInput | null)[]>,
) => {
  if (event.nativeEvent.key !== 'Backspace') return;

  const updatedCode = [...code];

  if (code[index]) {
    updatedCode[index] = '';
    setCode(updatedCode);
    return;
  }

  if (index > 0) {
    updatedCode[index - 1] = '';
    setCode(updatedCode);
    inputs.current[index - 1]?.focus();
  }
};

export const formatOtpTimer = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

export const formatMessageDateLabel = (dateString: string): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const messageDate = new Date(dateString);

  if (isNaN(messageDate.getTime())) {
    return 'Invalid Date';
  }

  if (messageDate.toDateString() === today.toDateString()) {
    return 'TODAY';
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'YESTERDAY';
  } else if (today.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[messageDate.getDay()].toUpperCase();
  } else {
    return messageDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
  }
};

export const formatNotificationDateGroup = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const sevenDaysAgoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const thirtyDaysAgoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);

  if (date.getTime() >= todayStart.getTime()) {
    return 'Today';
  } else if (date.getTime() >= yesterdayStart.getTime()) {
    return 'Yesterday';
  } else if (date.getTime() >= sevenDaysAgoStart.getTime()) {
    return 'Last 7 Days';
  } else if (date.getTime() >= thirtyDaysAgoStart.getTime()) {
    return 'Last 30 Days';
  } else {
    return 'Older';
  }
};

export const formatNotificationTimestamp = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return '';
  }

  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w`;
  } else if (diffMonths < 12) {
    return `${diffMonths}mo`;
  } else {
    return `${diffYears}y`;
  }
};

export const parseDateString = (dateInput: string | Date): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const compareMessageTimestamps = (a: { timestamp: string }, b: { timestamp: string }): number => {
  const dateA = parseDateString(a.timestamp);
  const dateB = parseDateString(b.timestamp);
  if (!dateA || !dateB) return 0;
  return dateA.getTime() - dateB.getTime();
};

export const generateClientTempId = (): string => {
  return `client_temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const getUserAvatar = (user: { avatar: string | null; username: string }) => {
  return user.avatar || `https://ui-avatars.com/api/?name=${user.username.replace(/\s/g, '+')}`;
};

export const getUserStatusLabel = (
  status?: 'pending' | 'lockedIn' | 'onesidedlock' | 'declined',
  relationToMe?: 'knocker' | 'knocked' | 'lockedIn' | 'stranger'
): string => {
  if (!status || !relationToMe) {
    if (relationToMe === 'stranger') {
      return 'New user';
    }
    return '';
  }

  switch (relationToMe) {
    case 'lockedIn':
      return 'Locked In';
    case 'knocker':
      if (status === 'pending') {
        return 'Pending your knock back';
      } else if (status === 'onesidedlock') {
        return 'Knocker';
      } else if (status === 'lockedIn') {
        return 'Locked In';
      }
      return 'Knocked you';
    case 'knocked':
      if (status === 'pending') {
        return 'Knock request sent';
      } else if (status === 'onesidedlock') {
        return 'Knocking';
      } else if (status === 'lockedIn') {
        return 'Locked In';
      }
      return 'You knocked';
    case 'stranger':
      return 'New user';
    default:
      return '';
  }
};

export const sortUsersByStatusAndRelation = (a: DisplayUser, b: DisplayUser): number => {
  const relationOrder: { [key in Required<DisplayUser>['relationToMe']]: number } = {
    lockedIn: 1,
    knocker: 2,
    knocked: 3,
    stranger: 4,
  };

  const relationA = a.relationToMe || 'stranger';
  const relationB = b.relationToMe || 'stranger';

  const orderA = relationOrder[relationA];
  const orderB = relationOrder[relationB];

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.username.localeCompare(b.username);
};

export const safeFormatDate = (dateString: string): string => {
  const date = parseDateString(dateString);
  return date ? format(date, 'p') : "Invalid Date";
};

export const filterValidChats = (chats: ChatPreviewResponse[]): ChatPreviewResponse[] => {
  return chats.filter(chat =>
    chat.lastMessage &&
    chat.lastMessage.trim() !== 'No messages yet' &&
    chat.lastMessage.trim() !== 'Start chatting!' &&
    chat.lastMessage.trim() !== ''
  );
};

export const sortChatsByTimestamp = (a: ChatPreviewResponse, b: ChatPreviewResponse) => {
  const dateA = parseDateString(a.timestamp);
  const dateB = parseDateString(b.timestamp);
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return dateB.getTime() - dateA.getTime();
};