// components/CommonHeader.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { ThemedText } from './ThemedText';
import BackButton from './BackButton';
import { ThemedView } from './ThemedView';

interface CommonHeaderProps {
  pageTitle: string;
  optionalIconName?: keyof typeof Ionicons.glyphMap;
  onOptionalIconPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  rightIconSize?: number;
  rightIconColor?: string;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({
  pageTitle,
  optionalIconName,
  onOptionalIconPress,
  style,
  titleStyle,
  rightIconSize = 28,
  rightIconColor,
}) => {
  const { colors } = useTheme();

  return (
    <ThemedView style={[styles.headerContainer, { borderBottomColor: colors.border }, style]}>
      <BackButton />
      <ThemedText type="title" style={[styles.headerTitle, { color: colors.text }, titleStyle]}>
        {pageTitle}
      </ThemedText>
      {optionalIconName && onOptionalIconPress ? (
        <TouchableOpacity onPress={onOptionalIconPress} style={styles.rightIconWrapper}>
          <Ionicons
            name={optionalIconName}
            size={rightIconSize}
            color={rightIconColor || colors.text}
          />
        </TouchableOpacity>
      ) : (
        <ThemedView style={styles.rightSpacer}></ThemedView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    width: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  rightIconWrapper: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSpacer: {
    width: 30,
  },
});

export default CommonHeader;