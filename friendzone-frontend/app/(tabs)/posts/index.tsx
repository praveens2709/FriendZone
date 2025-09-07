import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { showToast } from "@/constants/Functions";
import { MediaAsset } from "@/types/media.type";

const { width } = Dimensions.get("window");
const SPACING = 4;
const NUM_COLUMNS = 3;
const TILE_SIZE = (width - SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
const PREVIEW_CONTAINER_SIZE = width;

export default function PostsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const requestPermissions = useCallback(async () => {
    try {
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission =
        await MediaLibrary.requestPermissionsAsync();

      if (
        cameraPermission.status === "granted" &&
        mediaLibraryPermission.status === "granted"
      ) {
        setHasPermission(true);
        await fetchMediaAssets();
      } else {
        setHasPermission(false);
        Alert.alert(
          "Permission Required",
          "Camera and gallery permissions are needed to create a new post."
        );
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to get permissions:", error);
      setIsLoading(false);
      setHasPermission(false);
    }
  }, []);

  const fetchMediaAssets = async () => {
    try {
      setIsLoading(true);

      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 50,
        sortBy: [MediaLibrary.SortBy.creationTime],
        mediaType: [MediaLibrary.MediaType.photo],
      });

      if (!assets) return;

      const fetchedMedia: MediaAsset[] = [];

      for (const asset of assets) {
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
          const uri = assetInfo.localUri || asset.uri;

          fetchedMedia.push({
            id: asset.id,
            uri: uri,
            width: assetInfo.width,
            height: assetInfo.height,
          });
        } catch (error) {
          console.error("Error getting asset info for:", asset.filename, error);
          fetchedMedia.push({
            id: asset.id,
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
          });
        }
      }

      setMediaAssets([{ id: "camera-button", uri: "" }, ...fetchedMedia]);

      if (fetchedMedia.length > 0) {
        setSelectedAssets([fetchedMedia[0]]);
        resetTransform();
      }
    } catch (error) {
      console.error("Failed to fetch media assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  const handleCameraPress = async () => {
    if (!hasPermission) {
      requestPermissions();
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newAsset: MediaAsset = {
          id: result.assets[0].uri,
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
        };
        setSelectedAssets([newAsset]);
        resetTransform();
      }
    } catch (error) {
      console.error("Failed to open camera:", error);
    }
  };

  const handleAssetPress = (asset: MediaAsset) => {
    if (isMultiSelect) {
      const isSelected = selectedAssets.some((sa) => sa.id === asset.id);
      if (isSelected) {
        setSelectedAssets(selectedAssets.filter((sa) => sa.id !== asset.id));
      } else {
        setSelectedAssets([...selectedAssets, asset]);
      }
    } else {
      setSelectedAssets([asset]);
      resetTransform();
    }
  };

  const renderAssetItem = ({ item }: { item: MediaAsset }) => {
    if (item.id === "camera-button") {
      return (
        <TouchableOpacity
          onPress={handleCameraPress}
          style={[
            styles.cameraButton,
            { backgroundColor: colors.buttonBackgroundSecondary },
          ]}
        >
          <MaterialCommunityIcons
            name="camera"
            size={44}
            color={colors.primary}
          />
        </TouchableOpacity>
      );
    }

    const isSelected = selectedAssets.some((sa) => sa.id === item.id);

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => handleAssetPress(item)}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.thumbnail}
          onError={(error) =>
            console.error("Image load error:", error.nativeEvent.error)
          }
        />
        {isSelected && (
          <View
            style={[styles.selectionOverlay, { borderColor: colors.border }]}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color={colors.text}
              style={styles.checkIcon}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleNextPress = async () => {
    if (selectedAssets.length === 0) {
      showToast(
        "No Media Selected",
        "Please select at least one photo to continue."
      );
      return;
    }

    setIsLoading(true);

    const firstAsset = selectedAssets[0];
    if (
      !firstAsset ||
      !firstAsset.uri ||
      !firstAsset.width ||
      !firstAsset.height
    ) {
      showToast("Error", "Could not get selected image details.");
      setIsLoading(false);
      return;
    }

    try {
      const finalScale = savedScale.value;
      const finalTranslateX = savedTranslateX.value;
      const finalTranslateY = savedTranslateY.value;

      const originalWidth = firstAsset.width;
      const originalHeight = firstAsset.height;
      const imageAspectRatio = originalWidth / originalHeight;
      const containerSize = PREVIEW_CONTAINER_SIZE;

      let displayWidth, displayHeight;
      if (imageAspectRatio > 1) {
        displayWidth = containerSize;
        displayHeight = containerSize / imageAspectRatio;
      } else {
        displayHeight = containerSize;
        displayWidth = containerSize * imageAspectRatio;
      }

      const scaledDisplayWidth = displayWidth * finalScale;
      const scaledDisplayHeight = displayHeight * finalScale;

      const cropWidth =
        (containerSize / finalScale) * (originalWidth / displayWidth);
      const cropHeight =
        (containerSize / finalScale) * (originalHeight / displayHeight);

      const centerX = originalWidth / 2;
      const centerY = originalHeight / 2;

      const offsetX =
        (-finalTranslateX / finalScale) * (originalWidth / displayWidth);
      const offsetY =
        (-finalTranslateY / finalScale) * (originalHeight / displayHeight);

      const cropX = centerX + offsetX - cropWidth / 2;
      const cropY = centerY + offsetY - cropHeight / 2;

      const safeCropX = Math.max(0, Math.min(originalWidth - cropWidth, cropX));
      const safeCropY = Math.max(
        0,
        Math.min(originalHeight - cropHeight, cropY)
      );
      const safeCropWidth = Math.min(cropWidth, originalWidth - safeCropX);
      const safeCropHeight = Math.min(cropHeight, originalHeight - safeCropY);

      const croppedResult = await ImageManipulator.manipulateAsync(
        firstAsset.uri,
        [
          {
            crop: {
              originX: safeCropX,
              originY: safeCropY,
              width: safeCropWidth,
              height: safeCropHeight,
            },
          },
        ],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      const croppedAsset = {
        id: firstAsset.id,
        uri: croppedResult.uri,
        width: croppedResult.width,
        height: croppedResult.height,
      };

      router.push({
        pathname: "/(tabs)/posts/edit-post",
        params: { selectedAssets: JSON.stringify([croppedAsset]) },
      });
    } catch (error) {
      console.error("Failed to crop image:", error);
      try {
        const originalAsset = {
          id: firstAsset.id,
          uri: firstAsset.uri,
          width: firstAsset.width,
          height: firstAsset.height,
        };

        router.push({
          pathname: "/(tabs)/posts/edit-post",
          params: { selectedAssets: JSON.stringify([originalAsset]) },
        });
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        Alert.alert("Error", "Failed to process the image. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetTransform = useCallback(() => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
  ]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      try {
        const currentAsset = selectedAssets[0];
        if (!currentAsset || !currentAsset.width || !currentAsset.height) {
          console.log("No valid asset for pan gesture");
          return;
        }

        const assetWidth = currentAsset.width;
        const assetHeight = currentAsset.height;
        const containerSize = PREVIEW_CONTAINER_SIZE;

        if (!assetWidth || !assetHeight) {
          console.log("Invalid dimensions:", { assetWidth, assetHeight });
          return;
        }

        const imageAspectRatio = assetWidth / assetHeight;
        if (isNaN(imageAspectRatio) || !isFinite(imageAspectRatio)) {
          console.log("Invalid aspect ratio:", imageAspectRatio);
          return;
        }

        let displayWidth, displayHeight;
        if (imageAspectRatio > 1) {
          displayWidth = containerSize;
          displayHeight = containerSize / imageAspectRatio;
        } else {
          displayHeight = containerSize;
          displayWidth = containerSize * imageAspectRatio;
        }

        const currentScale = scale.value;
        if (isNaN(currentScale) || !isFinite(currentScale)) {
          console.log("Invalid current scale:", currentScale);
          return;
        }

        const scaledDisplayWidth = displayWidth * currentScale;
        const scaledDisplayHeight = displayHeight * currentScale;

        const maxTranslateX = Math.max(
          0,
          (scaledDisplayWidth - PREVIEW_CONTAINER_SIZE) / 2
        );
        const maxTranslateY = Math.max(
          0,
          (scaledDisplayHeight - PREVIEW_CONTAINER_SIZE) / 2
        );

        const newTranslateX = savedTranslateX.value + event.translationX;
        const newTranslateY = savedTranslateY.value + event.translationY;

        translateX.value = Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, newTranslateX)
        );
        translateY.value = Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, newTranslateY)
        );
      } catch (error) {
        console.error("Error in pan gesture:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          selectedAssets: selectedAssets.length,
          event: event,
        });
      }
    })
    .onEnd(() => {
      try {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } catch (error) {
        console.error("Error in pan gesture end:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      try {
        const currentAsset = selectedAssets[0];
        if (!currentAsset || !currentAsset.width || !currentAsset.height) {
          console.log("No valid asset for pinch gesture");
          return;
        }

        const assetWidth = currentAsset.width;
        const assetHeight = currentAsset.height;
        const containerSize = PREVIEW_CONTAINER_SIZE;

        if (!assetWidth || !assetHeight) {
          console.log("Invalid dimensions:", { assetWidth, assetHeight });
          return;
        }

        const imageAspectRatio = assetWidth / assetHeight;
        if (isNaN(imageAspectRatio) || !isFinite(imageAspectRatio)) {
          console.log("Invalid aspect ratio:", imageAspectRatio);
          return;
        }

        let displayWidth, displayHeight;
        if (imageAspectRatio > 1) {
          displayWidth = containerSize;
          displayHeight = containerSize / imageAspectRatio;
        } else {
          displayHeight = containerSize;
          displayWidth = containerSize * imageAspectRatio;
        }

        const maxScale = Math.max(
          containerSize / displayWidth,
          containerSize / displayHeight
        );
        const minScale = Math.min(
          1,
          Math.min(containerSize / displayWidth, containerSize / displayHeight)
        );

        if (
          isNaN(maxScale) ||
          isNaN(minScale) ||
          !isFinite(maxScale) ||
          !isFinite(minScale)
        ) {
          console.log("Invalid scale values:", {
            maxScale,
            minScale,
            displayWidth,
            displayHeight,
          });
          return;
        }

        const newScale = savedScale.value * event.scale;
        if (isNaN(newScale) || !isFinite(newScale)) {
          console.log("Invalid scale value:", newScale);
          return;
        }

        const constrainedScale = Math.max(
          minScale,
          Math.min(maxScale, newScale)
        );
        if (isNaN(constrainedScale) || !isFinite(constrainedScale)) {
          console.log("Invalid constrained scale:", constrainedScale);
          return;
        }

        scale.value = constrainedScale;
      } catch (error) {
        console.error("Error in pinch gesture:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          selectedAssets: selectedAssets.length,
          event: event,
        });
      }
    })
    .onEnd(() => {
      try {
        savedScale.value = scale.value;
      } catch (error) {
        console.error("Error in pinch gesture end:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    });

  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <ThemedText style={{ marginTop: 10 }}>Loading media...</ThemedText>
        </View>
      );
    }

    if (!hasPermission) {
      return (
        <View style={styles.centeredContainer}>
          <ThemedText style={{ textAlign: "center" }}>
            Permission to access camera and gallery is required to create a new
            post.
          </ThemedText>
          <TouchableOpacity
            onPress={requestPermissions}
            style={styles.permissionButton}
          >
            <ThemedText style={{ color: colors.buttonText }}>
              Grant Permissions
            </ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    const previewAsset =
      selectedAssets[0] || mediaAssets.find((a) => a.id !== "camera-button");

    return (
      <ThemedView style={{ flex: 1 }}>
        <View style={[styles.previewContainer, { backgroundColor: "#000" }]}>
          {previewAsset ? (
            <GestureDetector gesture={combinedGesture}>
              <Animated.Image
                source={{ uri: previewAsset.uri }}
                style={[styles.previewImage, animatedStyle]}
                resizeMode="contain"
              />
            </GestureDetector>
          ) : (
            <View style={styles.previewPlaceholder}>
              <ThemedText style={[styles.subText, { color: colors.textDim }]}>
                Select a photo to preview
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.recentsHeader}>
          <ThemedText style={styles.recentsText}>Recents</ThemedText>
          <TouchableOpacity
            style={[
              styles.multiSelectButton,
              {
                backgroundColor: isMultiSelect
                  ? colors.text
                  : colors.buttonBackgroundSecondary,
              },
            ]}
            onPress={() => setIsMultiSelect(!isMultiSelect)}
          >
            <MaterialCommunityIcons
              name="checkbox-multiple-blank-outline"
              size={18}
              color={isMultiSelect ? colors.background : colors.text}
            />
          </TouchableOpacity>
        </View>
        <FlatList
          data={mediaAssets}
          renderItem={renderAssetItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContainer}
        />
      </ThemedView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader
            title="New Post"
            rightContent1={
              <TouchableOpacity
                onPress={handleNextPress}
                style={styles.nextButton}
              >
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
          {renderContent()}
        </ThemedSafeArea>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradientContainer: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  nextButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#007AFF",
  },
  previewContainer: {
    width: "100%",
    height: PREVIEW_CONTAINER_SIZE,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  subText: { fontSize: 16, textAlign: "center" },
  recentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  recentsText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  multiSelectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  gridContainer: { paddingHorizontal: SPACING / 2, paddingBottom: 20 },
  gridItem: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: SPACING / 2,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  cameraButton: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: SPACING / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderRadius: 8,
  },
  checkIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
  },
});
