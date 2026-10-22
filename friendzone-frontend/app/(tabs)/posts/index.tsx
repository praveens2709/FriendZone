import { useTabBarSpace } from "@/hooks/useTabBarSpace";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import Button from "@/components/Button";
import InlineError from "@/components/InlineError";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { MediaAsset } from "@/types/media.type";
import { consumePostPublished } from "@/utils/postDraft";

const { width } = Dimensions.get("window");
const GAP = 2;
const NUM_COLUMNS = 4;
const TILE_SIZE = (width - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const PREVIEW = width;
const COLLAPSED = 96;
const SCROLL_RANGE = PREVIEW - COLLAPSED;
const RECENTS_HEIGHT = 52;
const MAX_SELECTION = 10;
const PAGE_SIZE = 80;
const MAX_DIMENSION = 2048;
const MAX_ZOOM = 4;

type GridItem = MediaAsset | { id: "camera-button"; uri: "" };

type Transform = { k: number; tx: number; ty: number };
type Resolved = { uri: string; width: number; height: number };

const AnimatedFlatList = Animated.FlatList<GridItem>;

export default function PostsScreen() {
  const { colors } = useTheme();
  const { space: tabSpace } = useTabBarSpace();
  const router = useRouter();

  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<MediaAsset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [fitMode, setFitMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const listRef = useRef<any>(null);
  const cursorRef = useRef<string | undefined>(undefined);
  const hasNextRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const resolvedRef = useRef<Map<string, Resolved>>(new Map());
  const transformsRef = useRef<Map<string, Transform>>(new Map());
  const activeIdRef = useRef<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollY = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const displayW = useSharedValue(PREVIEW);
  const displayH = useSharedValue(PREVIEW);
  const fitSV = useSharedValue(0);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(""), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);

  const saveActiveTransform = useCallback(() => {
    const id = activeIdRef.current;
    if (!id) return;
    transformsRef.current.set(id, {
      k: scale.value,
      tx: translateX.value,
      ty: translateY.value,
    });
  }, [scale, translateX, translateY]);

  const applyTransform = useCallback(
    (t: Transform) => {
      scale.value = t.k;
      translateX.value = t.tx;
      translateY.value = t.ty;
      savedScale.value = t.k;
      savedX.value = t.tx;
      savedY.value = t.ty;
    },
    [scale, translateX, translateY, savedScale, savedX, savedY]
  );

  const layoutFor = useCallback((w: number, h: number, fit: boolean) => {
    if (!w || !h) return { dw: PREVIEW, dh: PREVIEW };
    const ratio = w / h;
    if (fit) {
      return ratio >= 1
        ? { dw: PREVIEW, dh: PREVIEW / ratio }
        : { dw: PREVIEW * ratio, dh: PREVIEW };
    }
    return ratio >= 1
      ? { dw: PREVIEW * ratio, dh: PREVIEW }
      : { dw: PREVIEW, dh: PREVIEW / ratio };
  }, []);

  const resolveAsset = useCallback(async (asset: MediaAsset): Promise<Resolved> => {
    const cached = resolvedRef.current.get(asset.id);
    if (cached) return cached;
    let uri = asset.uri;
    let w = asset.width || 0;
    let h = asset.height || 0;
    if (uri.startsWith("ph://") || !uri.startsWith("file://")) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        uri = info.localUri || info.uri || uri;
        w = info.width || w;
        h = info.height || h;
      } catch {}
    }
    const resolved = { uri, width: w, height: h };
    resolvedRef.current.set(asset.id, resolved);
    return resolved;
  }, []);

  const activate = useCallback(
    async (asset: MediaAsset, fit = fitMode) => {
      saveActiveTransform();
      activeIdRef.current = asset.id;
      setActiveId(asset.id);
      const quick = layoutFor(asset.width || 0, asset.height || 0, fit);
      displayW.value = quick.dw;
      displayH.value = quick.dh;
      applyTransform(transformsRef.current.get(asset.id) ?? { k: 1, tx: 0, ty: 0 });
      const cached = resolvedRef.current.get(asset.id);
      setPreviewUri(cached ? cached.uri : asset.uri);
      const resolved = await resolveAsset(asset);
      if (activeIdRef.current !== asset.id) return;
      const real = layoutFor(resolved.width, resolved.height, fit);
      displayW.value = real.dw;
      displayH.value = real.dh;
      setPreviewUri(resolved.uri);
    },
    [fitMode, saveActiveTransform, layoutFor, displayW, displayH, applyTransform, resolveAsset]
  );

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (loadingMoreRef.current) return;
      if (!reset && !hasNextRef.current) return;
      loadingMoreRef.current = true;
      try {
        const page = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after: reset ? undefined : cursorRef.current,
          sortBy: [MediaLibrary.SortBy.creationTime],
          mediaType: [MediaLibrary.MediaType.photo],
        });
        cursorRef.current = page.endCursor;
        hasNextRef.current = page.hasNextPage;
        const fetched: MediaAsset[] = page.assets.map((a) => ({
          id: a.id,
          uri: a.uri,
          width: a.width,
          height: a.height,
        }));
        if (reset) {
          setMediaAssets(fetched);
          if (fetched.length > 0) {
            setSelected([fetched[0]]);
            activate(fetched[0]);
          }
        } else {
          setMediaAssets((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...fetched.filter((f) => !seen.has(f.id))];
          });
        }
      } catch {
        showMessage("Couldn't load your photos.");
      } finally {
        loadingMoreRef.current = false;
        setIsLoading(false);
      }
    },
    [activate, showMessage]
  );

  const requestPermissions = useCallback(async () => {
    try {
      let current = await MediaLibrary.getPermissionsAsync();
      if (current.status !== "granted" && current.canAskAgain) {
        current = await MediaLibrary.requestPermissionsAsync();
      }
      setCanAskAgain(current.canAskAgain);
      if (current.status === "granted") {
        setPermission("granted");
        await loadPage(true);
      } else {
        setPermission("denied");
        setIsLoading(false);
      }
    } catch {
      setPermission("denied");
      setIsLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    requestPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (consumePostPublished()) {
        transformsRef.current.clear();
        activeIdRef.current = null;
        setSelected([]);
        setActiveId(null);
        setPreviewUri(null);
        setIsMultiSelect(false);
        cursorRef.current = undefined;
        hasNextRef.current = true;
        scrollY.value = 0;
        listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
        loadPage(true);
      }
    }, [loadPage, scrollY])
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
  }, []);

  const handleCameraPress = async () => {
    try {
      const camera = await ImagePicker.requestCameraPermissionsAsync();
      if (camera.status !== "granted") {
        showMessage("Allow camera access in Settings to take a photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;
      const shot = result.assets[0];
      const asset: MediaAsset = {
        id: shot.uri,
        uri: shot.uri,
        width: shot.width,
        height: shot.height,
      };
      resolvedRef.current.set(asset.id, {
        uri: shot.uri,
        width: shot.width,
        height: shot.height,
      });
      setMediaAssets((prev) => [asset, ...prev]);
      if (isMultiSelect && selected.length < MAX_SELECTION) {
        setSelected((prev) => [...prev, asset]);
      } else {
        setSelected([asset]);
      }
      activate(asset);
      scrollToTop();
    } catch {
      showMessage("Couldn't open the camera.");
    }
  };

  const removeAsset = (asset: MediaAsset) => {
    const remaining = selected.filter((s) => s.id !== asset.id);
    setSelected(remaining);
    transformsRef.current.delete(asset.id);
    if (activeIdRef.current !== asset.id) return;
    activeIdRef.current = null;
    if (remaining.length > 0) {
      activate(remaining[remaining.length - 1]);
    } else {
      setActiveId(null);
      setPreviewUri(null);
      applyTransform({ k: 1, tx: 0, ty: 0 });
    }
  };

  const handleAssetPress = (asset: MediaAsset) => {
    if (!isMultiSelect) {
      setSelected([asset]);
      activate(asset);
      scrollToTop();
      return;
    }
    const isSelected = selected.some((s) => s.id === asset.id);
    if (isSelected) {
      if (activeId !== asset.id) {
        activate(asset);
        return;
      }
      removeAsset(asset);
      return;
    }
    if (selected.length >= MAX_SELECTION) {
      showMessage(`You can select up to ${MAX_SELECTION} photos.`);
      return;
    }
    setSelected([...selected, asset]);
    activate(asset);
  };

  const toggleMultiSelect = () => {
    if (isMultiSelect) {
      const keep = selected.find((s) => s.id === activeId) ?? selected[0];
      setIsMultiSelect(false);
      if (keep) {
        setSelected([keep]);
        if (keep.id !== activeId) activate(keep);
      }
    } else {
      setIsMultiSelect(true);
    }
  };

  const toggleFit = () => {
    const next = !fitMode;
    setFitMode(next);
    fitSV.value = next ? 1 : 0;
    transformsRef.current.clear();
    const asset = selected.find((s) => s.id === activeId);
    if (asset) {
      activeIdRef.current = null;
      activate(asset, next);
    }
  };

  const buildAsset = async (asset: MediaAsset): Promise<MediaAsset> => {
    const resolved = await resolveAsset(asset);
    const normalized = await ImageManipulator.manipulateAsync(resolved.uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const W = normalized.width;
    const H = normalized.height;
    const actions: ImageManipulator.Action[] = [];
    let outW = W;
    let outH = H;
    if (!fitMode) {
      const known = resolved.width && resolved.height ? resolved.width / resolved.height : W / H;
      const aligned = Math.abs(known - W / H) < 0.02;
      const t =
        (aligned ? transformsRef.current.get(asset.id) : undefined) ?? { k: 1, tx: 0, ty: 0 };
      const base = PREVIEW / Math.min(W, H);
      const side = Math.min(W, H) / t.k;
      const cx = W / 2 - t.tx / (base * t.k);
      const cy = H / 2 - t.ty / (base * t.k);
      const originX = Math.max(0, Math.min(W - side, cx - side / 2));
      const originY = Math.max(0, Math.min(H - side, cy - side / 2));
      const cropSide = Math.max(1, Math.floor(side));
      actions.push({
        crop: {
          originX: Math.floor(originX),
          originY: Math.floor(originY),
          width: Math.min(cropSide, W - Math.floor(originX)),
          height: Math.min(cropSide, H - Math.floor(originY)),
        },
      });
      outW = cropSide;
      outH = cropSide;
    }
    if (Math.max(outW, outH) > MAX_DIMENSION) {
      actions.push({
        resize: outW >= outH ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION },
      });
    }
    const result = await ImageManipulator.manipulateAsync(normalized.uri, actions, {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { id: asset.id, uri: result.uri, width: result.width, height: result.height };
  };

  const handleNextPress = async () => {
    if (!selected.length || isProcessing) return;
    saveActiveTransform();
    setIsProcessing(true);
    try {
      const built: MediaAsset[] = [];
      for (const asset of selected) {
        built.push(await buildAsset(asset));
      }
      router.push({
        pathname: "/(tabs)/posts/edit-post",
        params: { selectedAssets: JSON.stringify(built) },
      });
    } catch {
      showMessage("Couldn't prepare your photos. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const windowStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, SCROLL_RANGE],
      [PREVIEW, COLLAPSED],
      Extrapolation.CLAMP
    ),
  }));

  const imageStyle = useAnimatedStyle(() => ({
    width: displayW.value,
    height: displayH.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scrollY.value > 4 || fitSV.value === 1) return;
      const maxX = Math.max(0, (displayW.value * scale.value - PREVIEW) / 2);
      const maxY = Math.max(0, (displayH.value * scale.value - PREVIEW) / 2);
      translateX.value = Math.max(-maxX, Math.min(maxX, savedX.value + event.translationX));
      translateY.value = Math.max(-maxY, Math.min(maxY, savedY.value + event.translationY));
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      if (scrollY.value > 4 || fitSV.value === 1) return;
      const next = Math.max(1, Math.min(MAX_ZOOM, savedScale.value * event.scale));
      scale.value = next;
      const maxX = Math.max(0, (displayW.value * next - PREVIEW) / 2);
      const maxY = Math.max(0, (displayH.value * next - PREVIEW) / 2);
      translateX.value = Math.max(-maxX, Math.min(maxX, translateX.value));
      translateY.value = Math.max(-maxY, Math.min(maxY, translateY.value));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const tapGesture = Gesture.Tap().onEnd((_event, success) => {
    if (success && scrollY.value > 4) runOnJS(scrollToTop)();
  });

  const previewGesture = Gesture.Exclusive(
    Gesture.Simultaneous(panGesture, pinchGesture),
    tapGesture
  );

  const renderItem = ({ item }: { item: GridItem }) => {
    if (item.id === "camera-button") {
      return (
        <TouchableOpacity
          onPress={handleCameraPress}
          activeOpacity={0.7}
          style={[styles.tile, { backgroundColor: colors.buttonBackgroundSecondary }]}
        >
          <MaterialCommunityIcons name="camera" size={34} color={colors.text} />
        </TouchableOpacity>
      );
    }
    const asset = item as MediaAsset;
    const index = selected.findIndex((s) => s.id === asset.id);
    const isSelected = index >= 0;
    const isActive = activeId === asset.id;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.tile}
        onPress={() => handleAssetPress(asset)}
      >
        <Image
          source={{ uri: asset.uri }}
          style={styles.thumbnail}
          contentFit="cover"
          recyclingKey={asset.id}
          transition={0}
        />
        {isSelected && !isMultiSelect && (
          <View style={[styles.selectedTint, { borderColor: colors.primary }]} />
        )}
        {isMultiSelect && (
          <>
            {isActive && <View style={[styles.selectedTint, { borderColor: colors.primary }]} />}
            <TouchableOpacity
              hitSlop={8}
              activeOpacity={0.7}
              onPress={() => (isSelected ? removeAsset(asset) : handleAssetPress(asset))}
              style={[
                styles.badge,
                isSelected
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: "rgba(0,0,0,0.25)", borderColor: "#fff" },
              ]}
            >
              {isSelected && (
                <ThemedText style={[styles.badgeText, { color: colors.buttonText }]}>
                  {index + 1}
                </ThemedText>
              )}
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const gridData: GridItem[] = [{ id: "camera-button", uri: "" }, ...mediaAssets];

  const renderBody = () => {
    if (permission === "denied") {
      return (
        <ThemedView style={styles.centered}>
          <MaterialCommunityIcons name="image-off-outline" size={44} color={colors.textDim} />
          <ThemedText style={[styles.permissionText, { color: colors.textDim }]}>
            Allow access to your photos to create a post.
          </ThemedText>
          <Button
            title={canAskAgain ? "Allow Access" : "Open Settings"}
            onPress={() => (canAskAgain ? requestPermissions() : Linking.openSettings())}
            style={styles.permissionButton}
          />
        </ThemedView>
      );
    }

    if (isLoading && mediaAssets.length === 0) {
      return (
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </ThemedView>
      );
    }

    return (
      <View style={styles.flex}>
        <AnimatedFlatList
          ref={listRef}
          data={gridData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          contentContainerStyle={{
            paddingTop: PREVIEW + RECENTS_HEIGHT,
            paddingBottom: tabSpace,
          }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onEndReached={() => loadPage(false)}
          onEndReachedThreshold={0.6}
          initialNumToRender={24}
          windowSize={7}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          extraData={{ selected, activeId, isMultiSelect }}
        />
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <Animated.View style={[styles.previewWindow, windowStyle]}>
            <GestureDetector gesture={previewGesture}>
              <Animated.View style={imageStyle}>
                {previewUri ? (
                  <Image
                    source={{ uri: previewUri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="fill"
                    transition={0}
                  />
                ) : null}
              </Animated.View>
            </GestureDetector>
            <TouchableOpacity
              onPress={toggleFit}
              style={styles.fitButton}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={fitMode ? "arrow-expand-all" : "arrow-collapse-all"}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </Animated.View>
          <View style={[styles.recentsHeader, { backgroundColor: colors.background }]}>
            <ThemedText style={styles.recentsText}>Recents</ThemedText>
            <ThemedView style={styles.recentsRight}>
              {isMultiSelect && (
                <ThemedText style={[styles.countText, { color: colors.textDim }]}>
                  {selected.length}/{MAX_SELECTION}
                </ThemedText>
              )}
              <TouchableOpacity
                style={[
                  styles.multiSelectButton,
                  {
                    backgroundColor: isMultiSelect ? colors.primary : colors.buttonBackgroundSecondary,
                  },
                ]}
                onPress={toggleMultiSelect}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="checkbox-multiple-blank-outline"
                  size={18}
                  color={isMultiSelect ? colors.buttonText : colors.text}
                />
                <ThemedText
                  style={[
                    styles.multiSelectLabel,
                    { color: isMultiSelect ? colors.buttonText : colors.text },
                  ]}
                >
                  Select
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </View>
        </View>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ScreenBackground style={styles.flex}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader
            title="New Post"
            rightContent1={
              isProcessing ? (
                <ActivityIndicator size="small" color={colors.text} style={styles.nextButton} />
              ) : (
                <TouchableOpacity
                  onPress={handleNextPress}
                  style={styles.nextButton}
                  disabled={selected.length === 0}
                >
                  <ThemedText
                    style={[
                      styles.nextButtonText,
                      { color: colors.primary, opacity: selected.length === 0 ? 0.4 : 1 },
                    ]}
                  >
                    Next
                  </ThemedText>
                </TouchableOpacity>
              )
            }
            showBottomBorder={false}
          />
          <InlineError message={message} style={styles.message} />
          {renderBody()}
        </ThemedSafeArea>
      </ScreenBackground>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  nextButton: { paddingVertical: 5, paddingHorizontal: 10 },
  nextButtonText: { fontSize: 16, fontWeight: "bold" },
  message: { paddingHorizontal: 16, paddingBottom: 6 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  permissionText: { textAlign: "center", fontSize: 15 },
  permissionButton: { width: 200 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 },
  previewWindow: {
    width: "100%",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  fitButton: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  recentsHeader: {
    height: RECENTS_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  recentsRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  recentsText: { fontSize: 16, fontWeight: "bold" },
  countText: { fontSize: 13, fontWeight: "600" },
  multiSelectButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  multiSelectLabel: { fontSize: 13, fontWeight: "700" },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnail: { width: "100%", height: "100%" },
  selectedTint: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
});
