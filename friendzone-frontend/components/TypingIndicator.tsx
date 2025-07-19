import React from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from './ThemedView';

interface TypingIndicatorProps {
  isTyping: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping }) => {
  const { colors } = useTheme();

  if (!isTyping) {
    return null;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
      <ThemedText style={[styles.text, { color: colors.textDim }]}>
        Typing...
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default TypingIndicator;