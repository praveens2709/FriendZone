// AuthModalContent.tsx
import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from '@/app/(auth)/login';
import SignupScreen from '@/app/(auth)/signup';
import { useTheme } from '@/context/ThemeContext';
import ThemedScrollView from './ThemedScrollView';
import { ThemedView } from './ThemedView';

interface AuthModalContentProps {
  initialMode: 'login' | 'signup';
  onCloseModal: () => void;
}

export default function AuthModalContent({ initialMode, onCloseModal }: AuthModalContentProps) {
  const [currentMode, setCurrentMode] = useState<'login' | 'signup'>(initialMode);
  const { colors } = useTheme();

  const handleSwitchToSignup = () => setCurrentMode('signup');
  const handleSwitchToLogin = () => setCurrentMode('login');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ThemedView style={styles.container}>
          <TouchableOpacity onPress={onCloseModal} style={styles.closeButton}>
            <Ionicons name="close" size={30} color={colors.textDim} />
          </TouchableOpacity>

          <ThemedScrollView
          style={{backgroundColor:"transparent"}}
          >
            {currentMode === 'login' ? (
              <LoginScreen isModal onSwitchToSignup={handleSwitchToSignup} onCloseModal={onCloseModal} />
            ) : (
              <SignupScreen isModal onSwitchToLogin={handleSwitchToLogin} onCloseModal={onCloseModal} />
            )}
          </ThemedScrollView>
        </ThemedView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    paddingTop: 50,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    zIndex: 10,
  },
});
