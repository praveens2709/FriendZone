import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  FlatList,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  View,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import { Image } from "expo-image";
import BackButton from "@/components/BackButton";
import ThemedModal from "@/components/ThemedModal";
import InlineError from "@/components/InlineError";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";
import { usePostEdit } from "@/hooks/usePostEditor";
import { useTabBarSpace } from "@/hooks/useTabBarSpace";
import { Track } from "@/types/media.type";

const { width } = Dimensions.get("window");
const THUMB = 56;

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
};

export default function EditPostScreen() {
  const { colors } = useTheme();
  const { space: tabSpace } = useTabBarSpace();
  const params = useLocalSearchParams();
  const pagerRef = useRef<FlatList>(null);
  const progressWidth = useRef(0);

  const { state, handlers } = usePostEdit(params.selectedAssets as string);

  const {
    selectedAssets,
    currentImageIndex,
    isProcessing,
    editError,
    showMusicModal,
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    selectedTrack,
    marqueeOffset,
    player,
  } = state;

  const {
    setSearchQuery,
    setCurrentImageIndex,
    handleRotate,
    handleFlip,
    handleReset,
    removeImage,
    handleNext,
    togglePreview,
    seekPlayer,
    selectTrack,
    setShowMusicModal,
    closeMusicModal,
    removeSelectedTrack,
  } = handlers;

  const current = selectedAssets[currentImageIndex];
  const canReset = !!current && (current.rotation !== 0 || current.flipped);
  const marqueeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: marqueeOffset.value }],
  }));
  const selectedActive = !!selectedTrack && player.activeUrl === selectedTrack.previewUrl;
  const selectedStatus = selectedActive ? player.status : "idle";
  const progress =
    selectedActive && player.durationMs > 0 ? player.positionMs / player.durationMs : 0;

  useEffect(() => {
    if (!selectedAssets.length) return;
    const index = Math.min(currentImageIndex, selectedAssets.length - 1);
    pagerRef.current?.scrollToIndex({ index, animated: false });
  }, [selectedAssets.length]);

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
    pagerRef.current?.scrollToIndex({ index, animated: true });
  };

  const renderTrack = ({ item }: { item: Track }) => {
    const active = player.activeUrl === item.previewUrl;
    const loading = active && player.status === "loading";
    const playing = active && player.status === "playing";
    const failed = active && player.status === "error";

    return (
      <TouchableOpacity onPress={() => selectTrack(item)} activeOpacity={0.7}>
        <ThemedView style={[styles.trackRow, { borderColor: colors.border }]}>
          <Image source={{ uri: item.artworkUrl100 }} style={styles.artwork} />
          <ThemedView style={styles.trackInfo}>
            <ThemedText style={styles.trackName} numberOfLines={1}>
              {item.trackName}
            </ThemedText>
            <ThemedText
              style={[styles.artistName, failed && { color: colors.error, opacity: 1 }]}
              numberOfLines={1}
            >
              {failed ? "Preview unavailable" : item.artistName}
            </ThemedText>
          </ThemedView>
          <TouchableOpacity
            onPress={() => togglePreview(item.previewUrl)}
            style={[
              styles.iconButton,
              { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <MaterialCommunityIcons
                name={playing ? "pause" : failed ? "refresh" : "play"}
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
            <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
          </TouchableOpacity>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  if (selectedAssets.length === 0) {
    return (
      <ScreenBackground style={styles.gradientContainer}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader title="Edit Post" leftContent={<BackButton color={colors.text} />} />
          <ThemedView style={styles.centeredContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </ThemedView>
        </ThemedSafeArea>
      </ScreenBackground>
    );
  }

  const toolButton = (
    icon: keyof typeof MaterialCommunityIcons.glyphMap,
    label: string,
    onPress: () => void,
    disabled = false
  ) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isProcessing}
      style={[styles.tool, { opacity: disabled || isProcessing ? 0.4 : 1 }]}
      activeOpacity={0.7}
    >
      <ThemedView
        style={[
          styles.toolCircle,
          { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      </ThemedView>
      <ThemedText style={[styles.toolLabel, { color: colors.textDim }]}>{label}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ScreenBackground style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton color={colors.text} />}
          title="Edit Post"
          rightContent1={
            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextButton}
              disabled={isProcessing}
            >
              <ThemedText
                style={[
                  styles.nextButtonText,
                  { color: colors.primary, opacity: isProcessing ? 0.4 : 1 },
                ]}
              >
                Next
              </ThemedText>
            </TouchableOpacity>
          }
          showBottomBorder={false}
        />
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: tabSpace }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.imageContainer, { backgroundColor: "#000" }]}>
            <FlatList
              ref={pagerRef}
              data={selectedAssets}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={(e) =>
                setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))
              }
              renderItem={({ item }) => (
                <View style={styles.page}>
                  <Image source={{ uri: item.uri }} style={styles.previewImage} contentFit="contain" />
                </View>
              )}
            />
            {selectedAssets.length > 1 && (
              <View style={styles.counterPill}>
                <ThemedText style={styles.counterPillText}>
                  {currentImageIndex + 1}/{selectedAssets.length}
                </ThemedText>
              </View>
            )}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>

          {selectedAssets.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStrip}
            >
              {selectedAssets.map((asset, index) => (
                <TouchableOpacity
                  key={asset.id}
                  onPress={() => goToImage(index)}
                  activeOpacity={0.8}
                  style={[
                    styles.thumb,
                    {
                      borderColor: index === currentImageIndex ? colors.primary : "transparent",
                    },
                  ]}
                >
                  <Image source={{ uri: asset.uri }} style={styles.thumbImage} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <InlineError message={editError} style={styles.editError} />

          <ThemedView style={styles.toolsRow}>
            {toolButton("rotate-right", "Rotate", handleRotate)}
            {toolButton("flip-horizontal", "Flip", handleFlip)}
            {toolButton("restore", "Reset", handleReset, !canReset)}
            {selectedAssets.length > 1 &&
              toolButton("trash-can-outline", "Remove", () => removeImage(currentImageIndex))}
          </ThemedView>

          <ThemedView style={styles.musicSection}>
            {!selectedTrack ? (
              <TouchableOpacity
                style={[
                  styles.addMusicButton,
                  { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border },
                ]}
                onPress={() => setShowMusicModal(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="music-note-plus" size={22} color={colors.text} />
                <ThemedText style={[styles.addMusicButtonText, { color: colors.text }]}>
                  Add Music
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <ThemedView
                style={[
                  styles.playerCard,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
              >
                <View style={styles.playerTop}>
                  <Image
                    source={{ uri: selectedTrack.artworkUrl100 }}
                    style={[styles.playerArtwork, { borderColor: colors.border }]}
                  />
                  <View style={styles.playerText}>
                    <View style={styles.marqueeContainer}>
                      <Animated.View style={[{ flexDirection: "row" }, marqueeStyle]}>
                        <View style={{ flexDirection: "row" }}>
                          <ThemedText style={[styles.playerTitle, { color: colors.text }]}>
                            {selectedTrack.trackName} - {selectedTrack.artistName}
                          </ThemedText>
                        </View>
                      </Animated.View>
                    </View>
                    <ThemedText
                      style={[
                        styles.playerArtist,
                        { color: selectedStatus === "error" ? colors.error : colors.textDim },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedStatus === "error"
                        ? "Preview unavailable. Tap play to retry."
                        : "30 second preview"}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    onPress={() => togglePreview(selectedTrack.previewUrl)}
                    style={[styles.playButton, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                  >
                    {selectedStatus === "loading" ? (
                      <ActivityIndicator size="small" color={colors.buttonText} />
                    ) : (
                      <MaterialCommunityIcons
                        name={
                          selectedStatus === "playing"
                            ? "pause"
                            : selectedStatus === "error"
                            ? "refresh"
                            : "play"
                        }
                        size={22}
                        color={colors.buttonText}
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={removeSelectedTrack} style={styles.removeButton}>
                    <MaterialCommunityIcons name="close" size={22} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
                <View style={styles.progressRow}>
                  <ThemedText style={[styles.timeText, { color: colors.textDim }]}>
                    {formatTime(selectedActive ? player.positionMs : 0)}
                  </ThemedText>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.progressTouch}
                    onLayout={(e) => {
                      progressWidth.current = e.nativeEvent.layout.width;
                    }}
                    onPress={(e) => {
                      if (!selectedActive || !progressWidth.current) return;
                      seekPlayer(e.nativeEvent.locationX / progressWidth.current);
                    }}
                  >
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(100, progress * 100)}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                  <ThemedText style={[styles.timeText, { color: colors.textDim }]}>
                    {selectedActive && player.durationMs > 0 ? formatTime(player.durationMs) : "0:30"}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={() => setShowMusicModal(true)}
                  style={styles.changeSong}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.changeSongText, { color: colors.primary }]}>
                    Change song
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            )}
          </ThemedView>
        </ScrollView>
        <ThemedModal
          visible={showMusicModal}
          onClose={closeMusicModal}
          containerStyle={styles.modalContainer}
        >
          <ThemedView style={styles.modalHeader}>
            <TouchableOpacity onPress={closeMusicModal}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Search Music</ThemedText>
            <ThemedView style={{ width: 24 }} />
          </ThemedView>
          <ThemedView
            style={[
              styles.searchContainer,
              { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={20} color={colors.textDim} style={styles.searchIcon} />
            <TextInput
              placeholder="Search music..."
              placeholderTextColor={colors.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {isSearching && <ActivityIndicator size="small" color={colors.textDim} />}
          </ThemedView>
          <InlineError message={searchError} style={styles.editError} />
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => item.trackName + item.artistName + index}
            renderItem={renderTrack}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => Keyboard.dismiss()}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isSearching && !searchError ? (
                <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
                  No songs found.
                </ThemedText>
              ) : null
            }
          />
        </ThemedModal>
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  gradientContainer: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, backgroundColor: "transparent" },
  centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  nextButton: { paddingVertical: 5, paddingHorizontal: 10 },
  nextButtonText: { fontSize: 16, fontWeight: "bold" },
  imageContainer: { width, height: width, position: "relative", overflow: "hidden" },
  page: { width, height: width, justifyContent: "center", alignItems: "center" },
  previewImage: { width: "100%", height: "100%" },
  counterPill: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  counterPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbStrip: { paddingHorizontal: 15, paddingTop: 12, gap: 8 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  editError: { paddingHorizontal: 16, paddingTop: 8 },
  toolsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  tool: { alignItems: "center", gap: 6 },
  toolCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toolLabel: { fontSize: 12, fontWeight: "600" },
  musicSection: { paddingHorizontal: 20, marginTop: 24, width: "100%" },
  addMusicButton: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  addMusicButtonText: { fontSize: 16, fontWeight: "700" },
  playerCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  playerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  playerArtwork: { width: 52, height: 52, borderRadius: 10, borderWidth: 1 },
  playerText: { flex: 1, justifyContent: "center", gap: 2 },
  playerTitle: { fontSize: 16, fontWeight: "700", flexWrap: "nowrap" },
  playerArtist: { fontSize: 13 },
  marqueeContainer: { flexDirection: "row", overflow: "hidden", height: 22 },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: { padding: 4 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTouch: { flex: 1, height: 24, justifyContent: "center" },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  timeText: { fontSize: 12, fontWeight: "600", minWidth: 32, textAlign: "center" },
  changeSong: { alignSelf: "center", paddingVertical: 2 },
  changeSongText: { fontSize: 14, fontWeight: "700" },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
    marginBottom: 15,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: "100%", fontSize: 16, lineHeight: 18.8 },
  listContainer: { paddingBottom: 20, marginTop: 8 },
  emptyText: { textAlign: "center", marginTop: 24, fontSize: 14 },
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
    borderWidth: 1,
  },
});
