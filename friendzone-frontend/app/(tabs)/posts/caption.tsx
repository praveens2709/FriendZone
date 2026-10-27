import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useRouter, useLocalSearchParams } from "expo-router";
import { markPostPublished } from "@/utils/postDraft";
import { useUploadStore } from "@/store/uploadStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import { Image } from "expo-image";
import BackButton from "@/components/BackButton";
import InlineError from "@/components/InlineError";
import ThemedModal from "@/components/ThemedModal";
import useCurrentLocation from "@/hooks/useCurrentLocation";
import { countWords, getAddressFromCoords } from "@/constants/Functions";
import LocationSearch from "@/components/LocationSearch";
import Button from "@/components/Button";
import { MediaAsset, Track } from "@/types/media.type";
import { useAuth } from "@/context/AuthContext";

export default function CaptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accessToken } = useAuth();

  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const startPostUpload = useUploadStore((state) => state.startPostUpload);
  const requestCurrentLocation = useCurrentLocation();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (params.selectedAssets) {
      try {
        setSelectedAssets(JSON.parse(params.selectedAssets as string));
      } catch {
        
      }
    }
    if (params.selectedTrack) {
      try {
        setSelectedTrack(JSON.parse(params.selectedTrack as string));
      } catch { }
    }
  }, [params.selectedAssets, params.selectedTrack]);

  const handleCaptionChange = (text: string) => {
    if (countWords(text) <= 200) setCaption(text);
  };

  const handlePost = () => {
    if (!accessToken || !selectedAssets.length || isPosting) return;
    setPostError("");
    setIsPosting(true);
    const formData = new FormData();
    selectedAssets.forEach((asset, index) => {
      formData.append("images", {
        uri: asset.uri,
        name: `image_${Date.now()}_${index}.jpg`,
        type: "image/jpeg",
      } as any);
    });
    formData.append("caption", caption);
    if (location) formData.append("location", location);
    if (selectedTrack) formData.append("song", JSON.stringify(selectedTrack));
    startPostUpload(formData, selectedAssets[0].uri);
    markPostPublished();
    // Leave the Posts tab on its gallery so coming back doesn't show the old caption screen.
    router.dismissAll();
    router.replace("/(tabs)/home");
  };

  const handleUseCurrentLocation = async () => {
    setLocationError("");
    setLocating(true);
    try {
      const coords = await requestCurrentLocation();
      if (!coords) {
        setLocationError("Couldn't get your location. Check location access in Settings.");
        return;
      }
      const addr = await getAddressFromCoords(coords.latitude, coords.longitude);
      setLocation(addr);
      setSearchQuery("");
      setShowLocationModal(false);
    } finally {
      setLocating(false);
    }
  };

  const renderImagePreview = (asset: MediaAsset, index: number) => (
    <ThemedView key={asset.id} style={styles.imagePreviewContainer}>
      <Image
        source={{ uri: asset.uri }}
        style={styles.imagePreview}
        contentFit="cover"
      />
      {selectedAssets.length > 1 && (
        <ThemedView style={[styles.imageNumberBadge, { backgroundColor: colors.primary }]}>
          <ThemedText style={[styles.imageNumberText, { color: colors.buttonText }]}>{index + 1}</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );

  return (
    <ScreenBackground style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton color={colors.text} />}
          title="Add Caption"
          rightContent1={
            isPosting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <TouchableOpacity
                onPress={handlePost}
                style={[styles.postButton, { opacity: isPosting ? 0.5 : 1 }]}
                disabled={isPosting}
              >
                <ThemedText
                  style={[
                    styles.postButtonText,
                    { color: colors.text, opacity: 0.8 },
                  ]}
                >
                  Post
                </ThemedText>
              </TouchableOpacity>
            )
          }
        />
        <InlineError message={postError} style={styles.postError} />
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.imagesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesScrollContainer}
            >
              {selectedAssets.map(renderImagePreview)}
            </ScrollView>
          </ThemedView>

          {selectedTrack && (
            <ThemedView
              style={[
                styles.songPreviewContainer,
                {
                  backgroundColor: colors.buttonBackgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Image
                source={{ uri: selectedTrack.artworkUrl100 }}
                style={[styles.songArtwork, { borderColor: colors.border }]}
              />
              <ThemedView style={styles.songTextContainer}>
                <ThemedText
                  style={[styles.songTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedTrack.trackName}
                </ThemedText>
                <ThemedText
                  style={[styles.songArtist, { color: colors.textDim }]}
                  numberOfLines={1}
                >
                  {selectedTrack.artistName}
                </ThemedText>
              </ThemedView>
              <MaterialCommunityIcons
                name="music"
                size={20}
                color={colors.text}
              />
            </ThemedView>
          )}

          <ThemedView style={styles.inputContainer}>
            <TextInput
              style={[
                styles.captionInput,
                {
                  color: colors.text,
                  backgroundColor: colors.buttonBackgroundSecondary,
                },
              ]}
              placeholder="Write a caption (200 words max)..."
              placeholderTextColor={colors.textDim}
              value={caption}
              onChangeText={handleCaptionChange}
              multiline
              textAlignVertical="top"
            />
            <ThemedView style={styles.characterCount}>
              <ThemedText
                style={[styles.characterCountText, { color: colors.textDim }]}
              >
                {countWords(caption)}/200 words
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <TouchableOpacity
              style={[
                styles.locationInputContainer,
                {
                  backgroundColor: colors.buttonBackgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowLocationModal(true)}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color={colors.textDim}
                style={styles.locationIcon}
              />
              {location ? (
                <>
                  <ThemedText
                    style={[
                      styles.locationInput,
                      { color: colors.text, flex: 1 },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {location}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setLocation("")}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={20}
                      color={colors.textDim}
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <ThemedText
                  style={[styles.locationInput, { color: colors.textDim }]}
                >
                  Add location
                </ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </ThemedSafeArea>

      {showLocationModal && (
        <ThemedModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          containerStyle={styles.modalContainer}
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <ThemedView style={{ flex: 1 }}>
              <ThemedView style={styles.modalHeader}>
                <TouchableOpacity onPress={() => {
                  setSearchQuery("");
                  setLocationError("");
                  setShowLocationModal(false);
                }}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
                <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                  Search Location
                </ThemedText>
                <ThemedView style={{ width: 24 }} />
              </ThemedView>

              <LocationSearch
                placeholder="Search for a location..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onAddressSelect={(address) => {
                  setLocation(address);
                  setSearchQuery("");
                  setShowLocationModal(false);
                }}
              />

              <InlineError message={locationError} style={styles.locationError} />
              <Button
                onPress={handleUseCurrentLocation}
                disabled={locating}
                style={styles.currentLocationButton}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <ThemedView style={styles.currentLocationContent}>
                    <MaterialCommunityIcons
                      name="crosshairs-gps"
                      size={20}
                      color={colors.buttonText}
                    />
                    <ThemedText style={{ color: colors.buttonText, fontWeight: "700" }}>
                      Use Current Location
                    </ThemedText>
                  </ThemedView>
                )}
              </Button>
            </ThemedView>
          </TouchableWithoutFeedback>
        </ThemedModal>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  gradientContainer: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, backgroundColor: "transparent" },
  postError: { paddingHorizontal: 16, paddingVertical: 8 },
  postButton: { paddingVertical: 5, paddingHorizontal: 10 },
  postButtonText: { fontSize: 16, fontWeight: "bold" },
  imagesContainer: { paddingVertical: 15 },
  imagesScrollContainer: { paddingHorizontal: 15, gap: 10 },
  imagePreviewContainer: { position: "relative" },
  imagePreview: { width: 80, height: 80, borderRadius: 8 },
  imageNumberBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  imageNumberText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  songPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  songArtwork: { width: 40, height: 40, borderRadius: 20, borderWidth: 1 },
  songTextContainer: {
    flex: 1,
    marginHorizontal: 15,
    justifyContent: "center",
  },
  songTitle: { fontSize: 15, fontWeight: "bold" },
  songArtist: { fontSize: 13 },
  inputContainer: { paddingHorizontal: 15, marginBottom: 20 },
  captionInput: {
    minHeight: 120,
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    lineHeight: 24,
  },
  characterCount: { alignItems: "flex-end", marginTop: 8 },
  characterCountText: { fontSize: 12 },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  locationIcon: { marginRight: 10 },
  locationInput: { flex: 1, fontSize: 16 },
  currentLocationButton: { marginTop: 12, marginBottom: 20 },
  currentLocationContent: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "transparent" },
  locationError: { marginTop: 10 },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
});
