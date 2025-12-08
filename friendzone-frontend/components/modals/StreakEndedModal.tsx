import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import ThemedModal from '@/components/ThemedModal';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import WordleService from '@/services/WordleService';
import { useAuth } from '@/context/AuthContext';

interface StreakEndedModalProps {
  onPlayAgain: () => void;
}

const StreakEndedModal: React.FC<StreakEndedModalProps> = ({ onPlayAgain }) => {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (accessToken) {
      checkStreakStatus(accessToken);
    }
  }, [accessToken]);

  const checkStreakStatus = async (token: string) => {
    try {
      const status = await WordleService.checkStreak(token);
      if (status.streakEnded) {
        setVisible(true);
      }
    } catch (error) {
      console.error('Error checking streak:', error);
    }
  };

  const handlePlayAgain = () => {
    setVisible(false);
    onPlayAgain();
  };

  return (
    <ThemedModal visible={visible} onClose={() => setVisible(false)}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Streak Ended! 💔</ThemedText>
        <ThemedText style={[styles.description, { color: colors.textDim }]}>
          Your streak has ended because you missed a day. Start playing again to build a new streak!
        </ThemedText>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handlePlayAgain}
        >
          <ThemedText style={styles.buttonText}>Play Again</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StreakEndedModal;