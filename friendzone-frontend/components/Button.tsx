import React, { useState } from 'react';
import { Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { readableTextOn } from '@/utils/theme-utils';
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
  const [pressed, setPressed] = useState(false);

  let buttonBackgroundColor: string;
  let buttonBorderColor: string;
  let buttonBorderWidth: number;
  let buttonBorderBottomWidth: number;
  let textColor: string;

  if (variant === 'outline') {
    buttonBackgroundColor = 'transparent';
    buttonBorderColor = colors.primary;
    buttonBorderWidth = 2;
    buttonBorderBottomWidth = 2;
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
    textColor = readableTextOn(colors.primary, colors.buttonText);
  }

  return (
    <Pressable
      onPress={() => {
        setPressed(false);
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.commonButton,
        { backgroundColor: buttonBackgroundColor, borderColor: buttonBorderColor, borderWidth: buttonBorderWidth, borderBottomWidth: buttonBorderBottomWidth },
        variant === 'setting-item' && styles.settingItem,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
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
    </Pressable>
  );
};

const styles = StyleSheet.create({
  commonButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 6,
    width: '100%',
  },
  text: {
    fontWeight: '700',
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