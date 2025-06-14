import React from 'react';
import { View, StyleSheet, Dimensions, Platform, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { AppColors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface PhoneMockupPreviewProps {
  previewColors: AppColors;
  style?: ViewStyle;
}

const PhoneMockupPreview: React.FC<PhoneMockupPreviewProps> = ({ previewColors, style }) => {
  return (
    <ThemedView style={[styles.mobileFrame, style]}>
      <LinearGradient
        colors={previewColors.gradient}
        style={styles.previewContent}
      >
        {Platform.OS === 'ios' && (
          <ThemedView style={styles.dynamicIslandWrapper}>
            <ThemedView style={styles.dynamicIsland} />
          </ThemedView>
        )}

        <ThemedView style={styles.appContentInner}>
          <ThemedText type="subtitle" style={[styles.previewText, { color: previewColors.text }]}>
            FriendZone
          </ThemedText>
          <ThemedText type="default" style={[styles.previewSubText, { color: previewColors.textDim }]}>
            See how your app will look!
          </ThemedText>
          <ThemedView style={[styles.previewButton, { backgroundColor: previewColors.primary }]}>
            <ThemedText style={{ color: previewColors.buttonText }}>Button Text</ThemedText>
          </ThemedView>
        </ThemedView>
      </LinearGradient>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  mobileFrame: {
    width: width * 0.6,
    height: width * 0.6 * 1.7,
    borderRadius: 40,
    borderWidth: 4,
    backgroundColor: '#000',
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  previewContent: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dynamicIslandWrapper: {
    position: 'absolute',
    top: 10,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  dynamicIsland: {
    width: 100,
    height: 25,
    backgroundColor: 'black',
    borderRadius: 12.5,
  },
  appContentInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  previewText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  previewSubText: {
    fontSize: 14,
  },
  previewButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
});

export default PhoneMockupPreview;