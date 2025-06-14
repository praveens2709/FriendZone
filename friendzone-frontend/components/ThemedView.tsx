import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  const backgroundStyle =
    lightColor || darkColor
      ? { backgroundColor: typeof backgroundColor === 'string' ? backgroundColor : undefined }
      : {};

  return <View style={[backgroundStyle, style]} {...otherProps} />;
}
