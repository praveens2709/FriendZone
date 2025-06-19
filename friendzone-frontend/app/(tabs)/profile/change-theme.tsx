import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useThemeStore, ThemeType } from '@/store/themeStore';
import { useRouter } from 'expo-router';
import ThemeCard from '@/components/ThemeCard';
import { ThemedText } from '@/components/ThemedText';
import PhoneMockupPreview from '@/components/PhoneMockupPreview';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { showToast, HandleApiError } from '@/constants/Functions';
import { Colors } from '@/constants/Colors';
import { useLoadingDialog } from '@/context/LoadingContext';
import { ThemedView } from '@/components/ThemedView';
import CommonHeader from '@/components/CommonHeader';
import ThemedSafeArea from '@/components/ThemedSafeArea';
import BackButton from '@/components/BackButton';


const { width } = Dimensions.get('window');
const CARD_ITEM_WIDTH = (width / 3) - 20;

export default function ChangeThemeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { availableThemes, theme: currentGlobalTheme } = useThemeStore();
  const { session, updateUserTheme } = useAuth();
  const loadingDialog = useLoadingDialog();

  const [selectedThemeForPreview, setSelectedThemeForPreview] = useState<ThemeType>(currentGlobalTheme);

  useEffect(() => {
    setSelectedThemeForPreview(currentGlobalTheme);
  }, [currentGlobalTheme]);

  const previewColors = Colors[selectedThemeForPreview] ?? Colors.light;

  const handleSelectThemeCard = (themeName: ThemeType) => {
    setSelectedThemeForPreview(themeName);
  };

  const handleConfirmThemeChange = async () => {
    if (!session?.accessToken) {
      showToast('error', 'Authentication required to save theme.');
      router.replace('/(auth)/login');
      return;
    }

    if (selectedThemeForPreview === currentGlobalTheme) {
      showToast('info', 'This theme is already active!');
      return;
    }

    loadingDialog.show();
    try {
      await updateUserTheme(selectedThemeForPreview);
      showToast('success', `Theme updated to ${selectedThemeForPreview}!`);
    } catch (error) {
      HandleApiError(error);
    } finally {
      loadingDialog.hide();
    }
  };

  return (
    <>
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader title="Choose Theme" leftContent={<BackButton/>} />

          <ThemedView style={styles.themeCardsHorizontalContainer}>
            <FlatList
              data={availableThemes}
              keyExtractor={(item) => item}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: themeName }) => (
                <ThemeCard
                  themeName={themeName}
                  onPress={handleSelectThemeCard}
                  isSelected={themeName === selectedThemeForPreview}
                  style={styles.cardItem}
                />
              )}
              contentContainerStyle={styles.flatListHorizontalContent}
            />
          </ThemedView>

          <ThemedView style={styles.previewContentArea}>
            <ThemedText type="default" style={styles.previewHeading}>
              Preview: {selectedThemeForPreview.charAt(0).toUpperCase() + selectedThemeForPreview.slice(1)}
            </ThemedText>

            <PhoneMockupPreview previewColors={previewColors} />
          </ThemedView>

          <Button
            title="Confirm Theme Change"
            onPress={handleConfirmThemeChange}
            style={styles.confirmButton}
          />
        </ThemedSafeArea>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  themeCardsHorizontalContainer: {
    height: CARD_ITEM_WIDTH + 40,
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  flatListHorizontalContent: {
    alignItems: 'center',
  },
  cardItem: {
    marginHorizontal: 8,
  },
  previewContentArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  previewHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  confirmButton: {
    width: '80%',
    marginBottom: Platform.OS === 'ios' ? 68 : 0,
    alignSelf: 'center',
  },
});