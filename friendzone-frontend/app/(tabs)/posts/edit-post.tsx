import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  TextInput,
  FlatList,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import { Image } from "expo-image";
import BackButton from "@/components/BackButton";
import ThemedModal from "@/components/ThemedModal";
import LottieView from "lottie-react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";
import { usePostEdit } from "@/hooks/usePostEditor";
import { Track } from "@/types/media.type";

const { width } = Dimensions.get("window");

export default function EditPostScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const { state, handlers, refs } = usePostEdit(
    params.selectedAssets as string
  );

  const {
    selectedAssets,
    currentImageIndex,
    isProcessing,
    showMusicModal,
    searchQuery,
    searchResults,
    selectedTrack,
    loadingAudio,
    playingAudioUrl,
    marqueeOffset,
  } = state;

  const {
    setSearchQuery,
    handleRotate,
    handleFlip,
    handleNext,
    playPausePreview,
    selectTrack,
    playPauseSelectedTrack,
    setShowMusicModal,
    removeSelectedTrack,
  } = handlers;

  const { lottieRef } = refs;

  const currentImage = selectedAssets[currentImageIndex];
  const marqueeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: marqueeOffset.value }],
  }));
  const isSelectedTrackPlaying = playingAudioUrl === selectedTrack?.previewUrl;

  const renderItem = ({ item }: { item: Track }) => {
    const isPlaying = playingAudioUrl === item.previewUrl && !loadingAudio;
    const isLoading = playingAudioUrl === item.previewUrl && loadingAudio;

    return (
      <TouchableOpacity onPress={() => selectTrack(item)}>
        <ThemedView style={[styles.trackRow, { borderColor: colors.border }]}>
          <Image source={{ uri: item.artworkUrl100 }} style={styles.artwork} />
          <View style={styles.trackInfo}>
            <ThemedText style={styles.trackName} numberOfLines={1}>
              {item.trackName}
            </ThemedText>
            <ThemedText style={styles.artistName} numberOfLines={1}>
              {item.artistName}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => playPausePreview(item.previewUrl)}
            style={[
              styles.iconButton,
              { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border },
            ]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <MaterialCommunityIcons
                name={isPlaying ? "pause" : "play"}
                size={18}
                color={colors.text}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => selectTrack(item)}
            style={[
              styles.iconButton,
              { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border },
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.text}
            />
          </TouchableOpacity>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  if (selectedAssets.length === 0) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader
            title="Edit Post"
            leftContent={<BackButton color={colors.text} />}
          />
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText style={{ marginTop: 10 }}>Loading images...</ThemedText>
          </View>
        </ThemedSafeArea>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton color={colors.text} />}
          title="Edit Post"
          rightContent1={
            <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
              <ThemedText
                style={[
                  styles.nextButtonText,
                  { color: colors.text, opacity: 0.8 },
                ]}
              >
                Next
              </ThemedText>
            </TouchableOpacity>
          }
          showBottomBorder={false}
        />
        <View style={styles.container}>
          <View style={[styles.imageContainer, { backgroundColor: "#000" }]}>
            {currentImage && (
              <Image
                source={{ uri: currentImage.uri }}
                style={styles.previewImage}
                contentFit="contain"
              />
            )}
            <View style={styles.editControlsOverlay}>
              <TouchableOpacity
                style={[
                  styles.editControlButton,
                  { backgroundColor: colors.buttonBackgroundSecondary },
                ]}
                onPress={handleRotate}
                disabled={isProcessing}
              >
                <MaterialCommunityIcons
                  name="rotate-right"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editControlButton,
                  { backgroundColor: colors.buttonBackgroundSecondary },
                ]}
                onPress={handleFlip}
                disabled={isProcessing}
              >
                <MaterialCommunityIcons
                  name="flip-horizontal"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
                <ThemedText style={{ marginTop: 10, color: colors.text }}>
                  Processing...
                </ThemedText>
              </View>
            )}
          </View>
          <View style={styles.musicSection}>
            <TouchableOpacity
              style={[
                styles.addMusicButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => setShowMusicModal(true)}
            >
              <MaterialCommunityIcons
                name="music"
                size={20}
                color={colors.buttonText}
              />
              <ThemedText style={[styles.addMusicButtonText, {color: colors.buttonText}]}>
                Add Music
              </ThemedText>
            </TouchableOpacity>
            {selectedTrack && (
              <TouchableOpacity
                onPress={playPauseSelectedTrack}
                style={[
                  styles.selectedTrackBox,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Image
                  source={{ uri: selectedTrack.artworkUrl100 }}
                  style={[styles.songArtwork, { borderColor: colors.border }]}
                />
                <View style={styles.gapView} />
                <View style={styles.previewContent}>
                  <View style={styles.flexWrapper}>
                    <View style={styles.marqueeContainer}>
                      <Animated.View
                        style={[{ flexDirection: "row" }, marqueeStyle]}
                      >
                        <View style={{ flexDirection: "row" }}>
                          <ThemedText
                            style={{
                              color: colors.textSecondary,
                              fontSize: 16,
                              lineHeight: 20,
                              flexWrap: "nowrap",
                            }}
                          >
                            {selectedTrack.trackName} -{" "}
                            {selectedTrack.artistName}
                          </ThemedText>
                        </View>
                      </Animated.View>
                    </View>
                    <View style={styles.musicIndicatorContainer}>
                      {isSelectedTrackPlaying ? (
                        <LottieView
                          ref={lottieRef}
                          source={require("@/assets/animations/music.json")}
                          autoPlay={true}
                          loop={true}
                          style={styles.lottieAnimation}
                        />
                      ) : (
                        <View
                          style={[
                            styles.musicLine,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                      <TouchableOpacity
                        style={[
                          styles.playPauseButton,
                          { backgroundColor: colors.buttonBackgroundSecondary },
                        ]}
                        onPress={playPauseSelectedTrack}
                      >
                        <MaterialCommunityIcons
                          name={
                            isSelectedTrackPlaying
                              ? "pause-circle"
                              : "play-circle"
                          }
                          size={32}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      removeSelectedTrack();
                    }}
                    style={styles.removeButton}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={28}
                      color={colors.textDim}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          </View>
          {selectedAssets.length > 1 && (
            <View style={styles.imageCounter}>
              <ThemedText
                style={[styles.counterText, { color: colors.textDim }]}
              >
                {currentImageIndex + 1} of {selectedAssets.length}
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedModal
          visible={showMusicModal}
          onClose={() => setShowMusicModal(false)}
          containerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMusicModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
              Search Music
            </ThemedText>
            <View style={{ width: 24 }} />
          </View>
          <TextInput
            placeholder="Search music..."
            placeholderTextColor={colors.text}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border },
            ]}
          />
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) =>
              item.trackName + item.artistName + index
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            onScroll={() => Keyboard.dismiss()}
            showsVerticalScrollIndicator={false}
          />
        </ThemedModal>
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, backgroundColor: "transparent" },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButton: { paddingVertical: 5, paddingHorizontal: 10 },
  nextButtonText: { fontSize: 16, fontWeight: "bold" },
  imageContainer: {
    width: "100%",
    height: width,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageCounter: { alignItems: "center", paddingVertical: 10 },
  counterText: { fontSize: 14, fontWeight: "600" },
  editControlsOverlay: {
    position: "absolute",
    top: 15,
    right: 15,
    flexDirection: "row",
    gap: 10,
  },
  editControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  musicSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  addMusicButton: {
    width: "100%",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  addMusicButtonText: { fontSize: 16, fontWeight: "bold" },
  selectedTrackBox: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    paddingLeft: 0,
    borderRadius: 35,
    borderWidth: 1,
    width: "100%",
    marginTop: 20,
  },
  songArtwork: {
    height: 75,
    width: 75,
    borderRadius: 38,
    borderWidth: 1,
  },
  gapView: { width: 10 },
  previewContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: "100%",
    paddingHorizontal: 10,
  },
  flexWrapper: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    height: "100%",
    paddingRight: 10,
  },
  removeButton: {
    paddingLeft: 5,
  },
  marqueeContainer: { flexDirection: "row", overflow: "hidden", height: 20 },
  musicIndicatorContainer: {
    position: "relative",
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  lottieAnimation: { height: "100%", width: "100%" },
  musicLine: { height: 2, flex: 1, marginHorizontal: 15 },
  playPauseButton: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    marginTop: 120,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  input: {
    height: 50,
    borderRadius: 12,
    fontSize: 16,
    lineHeight: 18,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1
  },
  listContainer: { paddingBottom: 20, marginTop: 8 },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
    borderRadius: 8,
  },
  artwork: { width: 40, height: 40, borderRadius: 4, marginRight: 10 },
  trackInfo: { flex: 1, justifyContent: "center" },
  trackName: { fontSize: 14, fontWeight: "600" },
  artistName: { fontSize: 12, opacity: 0.7 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1
  },
});