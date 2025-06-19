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
        <View style={styles.headerContent}>
          <View style={styles.leftContainer}>{leftContent}</View>

          <View
            style={[
              styles.centerContainer,
              titleComponent ? styles.centerContainerLeftAligned : styles.centerContainerCentered,
            ]}
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
          </View>

          <View style={styles.rightContainer}>
            {rightContent1}
            {rightContent2}
          </View>
        </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerBase: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 50,
    overflow: 'visible',
  },
  headerBorder: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContainerLeftAligned: {
    alignItems: 'flex-start',
    marginLeft: 15,
    marginRight: 10,
  },
  centerContainerCentered: {
    alignItems: 'center',
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
    gap: 15,
  },
});