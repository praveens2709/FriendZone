import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/context/ThemeContext';

interface CommonHeaderProps {
  leftContent?: React.ReactNode;
  rightContent1?: React.ReactNode;
  rightContent2?: React.ReactNode;
  title?: string;
  titleComponent?: React.ReactNode;
  showBottomBorder?: boolean;
  style?: any;
}

export default function CommonHeader({
  leftContent,
  rightContent1,
  rightContent2,
  title,
  titleComponent,
  showBottomBorder = true,
  style,
}: CommonHeaderProps) {
  const { colors } = useTheme();

  return (
    <ThemedView
      style={[
        styles.headerBase,
        { borderBottomColor: colors.border },
        showBottomBorder && styles.headerBorder,
        style,
      ]}
    >
      <ThemedView style={styles.headerContentWrapper}>
        <ThemedView style={styles.leftContainer}>{leftContent}</ThemedView>
        <ThemedView style={styles.rightContainer}>
          {rightContent1}
          {rightContent2}
        </ThemedView>
      </ThemedView>
      <ThemedView
        style={[
          styles.absoluteCenterContainer,
          titleComponent ? styles.centerContainerLeftAligned : styles.centerContainerCentered,
        ]}
        pointerEvents="box-none"
      >
        {titleComponent ? (
          titleComponent
        ) : (
          title && (
            <ThemedText type="subtitle" style={[styles.titleText, { color: colors.text }]}>
              {title}
            </ThemedText>
          )
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerBase: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 50,
    overflow: 'hidden',
    alignItems: 'center',
  },
  headerBorder: {
    borderBottomWidth: 1,
  },
  headerContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: 'flex-start',
  },
  titleText: {
    fontWeight: 'bold',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: 'flex-end',
    gap: 20,
  },
  absoluteCenterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  centerContainerLeftAligned: {
    alignItems: 'flex-start',
    marginLeft: 60,
    marginRight: 10,
  },
  centerContainerCentered: {
    alignItems: 'center',
  },
});