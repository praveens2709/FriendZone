import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function PostsScreen() {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={colors.gradient}
      style={styles.gradientContainer}
    >
      <ThemedView style={styles.contentContainer}>
        <ThemedText style={styles.text}>Posts Screen</ThemedText>
        <ThemedText style={[styles.subText, { color: colors.textDim }]}>
          This is where your posts or feed will go!
        </ThemedText>
      </ThemedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    lineHeight: 30
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
  },
});