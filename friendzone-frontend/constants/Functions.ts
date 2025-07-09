import Toast, {ToastType} from 'react-native-toast-message';
import {Keyboard, NativeSyntheticEvent, TextInput, TextInputKeyPressEventData} from 'react-native';

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