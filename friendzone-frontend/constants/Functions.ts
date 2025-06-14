import Toast, {ToastType} from 'react-native-toast-message';
import {Keyboard, NativeSyntheticEvent, TextInput, TextInputKeyPressEventData} from 'react-native';

export const showToast = (type: ToastType, message: string) => {
  Toast.show({
    type,
    text1: message,
  });
};

export function HandleApiError(error: unknown) {
  console.log('Api Error', error);
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
