import { useState, useEffect, useRef, useCallback } from "react";
import { Dimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { EditableAsset, MediaAsset, Track } from "@/types/media.type";
import { useTrackPlayer } from "@/hooks/useTrackPlayer";

const { width } = Dimensions.get("window");

const toEditable = (assets: MediaAsset[]): EditableAsset[] =>
  assets.map((a) => ({ ...a, originalUri: a.uri, rotation: 0, flipped: false }));

export const usePostEdit = (selectedAssetsParam: string) => {
  const router = useRouter();
  const player = useTrackPlayer();
  const [selectedAssets, setSelectedAssets] = useState<EditableAsset[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editError, setEditError] = useState("");
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const searchRequestRef = useRef(0);
  const marqueeOffset = useSharedValue(0);

  useEffect(() => {
    marqueeOffset.value = withTiming(0, { duration: 0 });
    if (selectedTrack) {
      const timeoutId = setTimeout(() => {
        const titleText = `${selectedTrack.trackName} - ${selectedTrack.artistName}`;
        const textWidthEstimate = titleText.length * 8.5;
        const containerLayoutWidth = width - 190;
        if (textWidthEstimate > containerLayoutWidth) {
          const distance = textWidthEstimate - containerLayoutWidth;
          const duration = distance * 60;
          marqueeOffset.value = withDelay(
            1500,
            withRepeat(withTiming(-distance, { duration }), -1, true)
          );
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedTrack, marqueeOffset]);

  const togglePreview = useCallback(
    (url: string) => {
      player.toggle(url);
    },
    [player]
  );

  const selectTrack = useCallback(
    (track: Track) => {
      setSelectedTrack(track);
      setShowMusicModal(false);
      player.play(track.previewUrl);
    },
    [player]
  );

  const removeSelectedTrack = useCallback(() => {
    player.stop();
    setSelectedTrack(null);
  }, [player]);

  const closeMusicModal = useCallback(() => {
    setShowMusicModal(false);
    if (player.activeUrl && player.activeUrl !== selectedTrack?.previewUrl) {
      player.stop();
    }
  }, [player, selectedTrack]);

  const applyEdit = useCallback(
    async (index: number, rotation: number, flipped: boolean) => {
      const target = selectedAssets[index];
      if (!target || isProcessing) return;
      setEditError("");
      const actions: ImageManipulator.Action[] = [];
      if (rotation % 360 !== 0) actions.push({ rotate: rotation });
      if (flipped) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      setIsProcessing(true);
      try {
        let uri = target.originalUri;
        let w = target.width;
        let h = target.height;
        if (actions.length) {
          const result = await ImageManipulator.manipulateAsync(target.originalUri, actions, {
            compress: 0.92,
            format: ImageManipulator.SaveFormat.JPEG,
          });
          uri = result.uri;
          w = result.width;
          h = result.height;
        }
        setSelectedAssets((prev) =>
          prev.map((a, i) => (i === index ? { ...a, uri, width: w, height: h, rotation, flipped } : a))
        );
      } catch {
        setEditError("Couldn't edit this photo. Try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedAssets, isProcessing]
  );

  const handleRotate = useCallback(() => {
    const target = selectedAssets[currentImageIndex];
    if (!target) return;
    const delta = target.flipped ? -90 : 90;
    applyEdit(currentImageIndex, (target.rotation + delta + 360) % 360, target.flipped);
  }, [selectedAssets, currentImageIndex, applyEdit]);

  const handleFlip = useCallback(() => {
    const target = selectedAssets[currentImageIndex];
    if (!target) return;
    applyEdit(currentImageIndex, target.rotation, !target.flipped);
  }, [selectedAssets, currentImageIndex, applyEdit]);

  const handleReset = useCallback(() => {
    const target = selectedAssets[currentImageIndex];
    if (!target || (target.rotation === 0 && !target.flipped)) return;
    applyEdit(currentImageIndex, 0, false);
  }, [selectedAssets, currentImageIndex, applyEdit]);

  const removeImage = useCallback(
    (index: number) => {
      if (selectedAssets.length <= 1) return;
      setSelectedAssets((prev) => prev.filter((_, i) => i !== index));
      setCurrentImageIndex((prev) => {
        if (prev > index) return prev - 1;
        if (prev === index) return Math.max(0, Math.min(prev, selectedAssets.length - 2));
        return prev;
      });
    },
    [selectedAssets.length]
  );

  const searchMusic = useCallback(async (query: string) => {
    const requestId = ++searchRequestRef.current;
    setIsSearching(true);
    setSearchError("");
    try {
      let results: Track[];
      if (query === "bollywood") {
        const queries = ["Bollywood hits", "new Bollywood songs", "Arijit Singh", "Pritam hits"];
        const responses = await Promise.all(
          queries.map((q) =>
            fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(
                q
              )}&entity=musicTrack&limit=5&country=in`
            ).then((res) => res.json())
          )
        );
        results = responses.flatMap((json) => json.results || []);
      } else {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            query
          )}&entity=musicTrack&limit=20&country=in`
        );
        const json = await response.json();
        results = json.results || [];
      }
      if (requestId !== searchRequestRef.current) return;
      setSearchResults(results.filter((t) => !!t.previewUrl));
    } catch {
      if (requestId !== searchRequestRef.current) return;
      setSearchError("Couldn't load songs. Check your connection.");
    } finally {
      if (requestId === searchRequestRef.current) setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (selectedAssetsParam) {
        setSelectedAssets(toEditable(JSON.parse(selectedAssetsParam)));
        setCurrentImageIndex(0);
      }
    } catch {
      setEditError("Couldn't load your photos.");
    }
  }, [selectedAssetsParam]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        player.stop();
      };
    }, [])
  );

  useEffect(() => {
    if (showMusicModal && searchResults.length === 0 && !searchQuery.trim()) {
      searchMusic("bollywood");
    }
  }, [showMusicModal]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const delayDebounce = setTimeout(() => {
      if (trimmed) searchMusic(trimmed);
      else if (showMusicModal) searchMusic("bollywood");
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, searchMusic]);

  const handleNext = useCallback(async () => {
    if (isProcessing) return;
    await player.stop();
    router.push({
      pathname: "/(tabs)/posts/caption",
      params: {
        selectedAssets: JSON.stringify(
          selectedAssets.map(({ id, uri, width: w, height: h }) => ({ id, uri, width: w, height: h }))
        ),
        selectedTrack: selectedTrack ? JSON.stringify(selectedTrack) : null,
      },
    });
  }, [selectedAssets, selectedTrack, router, player, isProcessing]);

  return {
    state: {
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
      player: {
        activeUrl: player.activeUrl,
        status: player.status,
        positionMs: player.positionMs,
        durationMs: player.durationMs,
      },
    },
    handlers: {
      setSearchQuery,
      setCurrentImageIndex,
      handleRotate,
      handleFlip,
      handleReset,
      removeImage,
      handleNext,
      togglePreview,
      seekPlayer: player.seek,
      selectTrack,
      setShowMusicModal,
      closeMusicModal,
      removeSelectedTrack,
    },
  };
};
