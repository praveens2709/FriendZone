import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Button from './Button';

interface BackButtonProps {
  style?: ViewStyle;
  onPress?: () => void;
  size?: number;
  color?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ style, onPress, size = 30, color }) => {
  const router = useRouter();
  const { colors } = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Button
      onPress={handlePress}
      style={[styles.iconButton, style].filter(Boolean) as ViewStyle[]}
    >
      <Ionicons name="chevron-back" color={color || colors.text} size={size} />
    </Button>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginVertical: 0,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BackButton;