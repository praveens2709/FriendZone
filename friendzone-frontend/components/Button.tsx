import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './ThemedView';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  variant?: 'default' | 'outline' | 'setting-item';
  onLongPress?: () => void;
  children?: React.ReactNode;
  iconName?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ title, onPress, onLongPress, style, textStyle, variant = 'default', children, iconName, disabled = false, }) => {
  const { colors } = useTheme();

  let buttonBackgroundColor: string;
  let buttonBorderColor: string;
  let buttonBorderWidth: number;
  let buttonBorderBottomWidth: number;
  let textColor: string;

  if (variant === 'outline') {
    buttonBackgroundColor = 'transparent';
    buttonBorderColor = colors.primary;
    buttonBorderWidth = 2;
    buttonBorderBottomWidth = 0;
    textColor = colors.primary;
  } else if (variant === 'setting-item') {
    buttonBackgroundColor = 'transparent';
    buttonBorderColor = colors.border;
    buttonBorderWidth = 0;
    buttonBorderBottomWidth = 1;
    textColor = colors.text;
  } else {
    buttonBackgroundColor = colors.primary;
    buttonBorderColor = colors.primary;
    buttonBorderWidth = 0;
    buttonBorderBottomWidth = 0;
    textColor = colors.buttonText;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.commonButton,
        { backgroundColor: buttonBackgroundColor, borderColor: buttonBorderColor, borderWidth: buttonBorderWidth, borderBottomWidth: buttonBorderBottomWidth },
        variant === 'setting-item' && styles.settingItem,
        style,
      ]}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      {children ? (
        children
      ) : variant === 'setting-item' ? (
        <>
          <ThemedView style={styles.leftContent}>
            {iconName && <Ionicons name={iconName} size={24} color={colors.text} style={styles.iconMarginRight} />}
            {title && <ThemedText style={[styles.text, { color: textColor }, textStyle]}>{title}</ThemedText>}
          </ThemedView>
          <Ionicons name="chevron-forward" size={24} color={colors.textDim} />
        </>
      ) : (
        <ThemedText style={[styles.text, { color: textColor }, textStyle]}>{title}</ThemedText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  commonButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 6,
    width: '100%',
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 0,
    paddingVertical: 15,
    marginVertical: 0,
    paddingHorizontal: 0,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconMarginRight: {
    marginRight: 10,
  },
});

export default Button;