import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import { Image } from "expo-image";
import BackButton from "@/components/BackButton";
import ThemedModal from "@/components/ThemedModal";
import useCurrentLocation from "@/hooks/useCurrentLocation";
import { countWords, getAddressFromCoords, showToast } from "@/constants/Functions";
import LocationSearch from "@/components/LocationSearch";
import Button from "@/components/Button";
import { MediaAsset, Track } from "@/types/media.type";
import PostService from "@/services/PostService";
import { useAuth } from "@/context/AuthContext";

export default function CaptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accessToken } = useAuth();

  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const currentLocation = useCurrentLocation();

  useEffect(() => {
    if (params.selectedAssets) {
      try {
        setSelectedAssets(JSON.parse(params.selectedAssets as string));
      } catch {
        showToast("error", "Failed to load selected images");
      }
    }
    if (params.selectedTrack) {
      try {
        setSelectedTrack(JSON.parse(params.selectedTrack as string));
      } catch {}
    }
  }, [params.selectedAssets, params.selectedTrack]);

  const handleCaptionChange = (text: string) => {
    if (countWords(text) <= 200) setCaption(text);
  };

  const handlePost = async () => {
    if (!accessToken) {
      showToast("error", "Please log in to create a post.");
      return;
    }

    if (!selectedAssets.length) {
      showToast("error", "No images to post");
      return;
    }

    setIsPosting(true);
    try {
      const formData = new FormData();

      for (const asset of selectedAssets) {
        const uriParts = asset.uri.split(".");
        const fileType = uriParts[uriParts.length - 1];
        const fileName = `image_${asset.id}.${fileType}`;
        const mimeType = `image/${fileType}`;
        
        formData.append("images", {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any);
      }

      formData.append("caption", caption);
      if (location) {
        formData.append("location", location);
      }
      if (selectedTrack) {
        formData.append("song", JSON.stringify(selectedTrack));
      }

      await PostService.createPost(formData, accessToken);
      showToast("success", "Post created successfully!");
      router.push("/(tabs)/home");
    } catch (error) {
      console.error("Failed to create post:", error);
      showToast(
        "error",
        "Failed to create post. Please check your network and try again."
      );
    } finally {
      setIsPosting(false);
    }
  };

  const renderImagePreview = (asset: MediaAsset, index: number) => (
    <View key={asset.id} style={styles.imagePreviewContainer}>
      <Image
        source={{ uri: asset.uri }}
        style={styles.imagePreview}
        contentFit="cover"
      />
      {selectedAssets.length > 1 && (
        <View style={styles.imageNumberBadge}>
          <ThemedText style={styles.imageNumberText}>{index + 1}</ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
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
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imagesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesScrollContainer}
            >
              {selectedAssets.map(renderImagePreview)}
            </ScrollView>
          </View>

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
              <View style={styles.songTextContainer}>
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
              </View>
              <MaterialCommunityIcons
                name="music"
                size={20}
                color={colors.text}
              />
            </ThemedView>
          )}

          <View style={styles.inputContainer}>
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
            <View style={styles.characterCount}>
              <ThemedText
                style={[styles.characterCountText, { color: colors.textDim }]}
              >
                {countWords(caption)}/200 words
              </ThemedText>
            </View>
          </View>

          <View style={styles.inputContainer}>
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
          </View>
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
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
                <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                  Search Location
                </ThemedText>
                <View style={{ width: 24 }} />
              </View>

              <LocationSearch
                placeholder="Search for a location..."
                value={location}
                onChangeText={setLocation}
                onAddressSelect={(address) => {
                  setLocation(address);
                  setShowLocationModal(false);
                }}
              />

              {currentLocation && (
                <Button
                  onPress={async () => {
                    const addr = await getAddressFromCoords(
                      currentLocation.latitude,
                      currentLocation.longitude
                    );
                    setLocation(addr);
                    setShowLocationModal(false);
                  }}
                  style={styles.currentLocationButton}
                >
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={20}
                    color={colors.buttonText}
                    style={{ marginRight: 10 }}
                  />
                  <ThemedText style={{ color: colors.buttonText }}>
                    Use Current Location
                  </ThemedText>
                </Button>
              )}
            </View>
          </TouchableWithoutFeedback>
        </ThemedModal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, backgroundColor: "transparent" },
  postButton: { paddingVertical: 5, paddingHorizontal: 10 },
  postButtonText: { fontSize: 16, fontWeight: "bold" },
  imagesContainer: { paddingVertical: 15 },
  imagesScrollContainer: { paddingHorizontal: 15, gap: 10 },
  imagePreviewContainer: { position: "relative" },
  imagePreview: { width: 80, height: 80, borderRadius: 8 },
  imageNumberBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  imageNumberText: { color: "white", fontSize: 12, fontWeight: "bold" },
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
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 20,
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
});
