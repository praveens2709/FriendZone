import { useState, useEffect, useRef, useCallback } from "react";
import { Dimensions, Alert, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";
import { Audio } from "expo-av";
import LottieView from "lottie-react-native";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { MediaAsset, Track } from "@/types/media.type";

const { width } = Dimensions.get("window");

export const usePostEdit = (selectedAssetsParam: string) => {
  const router = useRouter();
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const lottieRef = useRef<LottieView | null>(null);
  const marqueeOffset = useSharedValue(0);

  useEffect(() => {
    marqueeOffset.value = withTiming(0, { duration: 0 });
    if (selectedTrack) {
      const timeoutId = setTimeout(() => {
        const titleText = `${selectedTrack.trackName} - ${selectedTrack.artistName}`;
        const textWidthEstimate = titleText.length * 8.5;
        const containerLayoutWidth = width - 150;
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

  const playPausePreview = useCallback(
    async (url: string) => {
      try {
        if (Platform.OS === 'android') {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Required", "Microphone permission is needed to play audio on this device.");
                return;
            }
        }
        if (soundRef.current && playingAudioUrl === url) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
          setPlayingAudioUrl(null);
          lottieRef.current?.pause();
          lottieRef.current?.reset();
        } else {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
          }
          setLoadingAudio(true);
          setPlayingAudioUrl(url);
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: true }
          );
          soundRef.current = newSound;
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              newSound.unloadAsync();
              setPlayingAudioUrl(null);
              lottieRef.current?.pause();
              lottieRef.current?.reset();
            }
          });
          setLoadingAudio(false);
        }
      } catch (err) {
        console.error("Error playing audio:", err);
        setLoadingAudio(false);
        setPlayingAudioUrl(null);
      }
    },
    [playingAudioUrl]
  );

  const selectTrack = useCallback(
    async (track: Track) => {
      setSelectedTrack(track);
      setShowMusicModal(false);
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      setPlayingAudioUrl(null);
      playPausePreview(track.previewUrl);
    },
    [playPausePreview]
  );

  const playPauseSelectedTrack = useCallback(async () => {
    if (selectedTrack) {
      await playPausePreview(selectedTrack.previewUrl);
    }
  }, [selectedTrack, playPausePreview]);

  const removeSelectedTrack = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    setSelectedTrack(null);
    setPlayingAudioUrl(null);
  }, []);

  const manipulateAsset = async (
    currentImage: MediaAsset,
    currentIndex: number,
    operation: ImageManipulator.Action
  ) => {
    setIsProcessing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        currentImage.uri,
        [operation],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setSelectedAssets((prevAssets) => {
        const updatedAssets = [...prevAssets];
        updatedAssets[currentIndex] = {
          ...updatedAssets[currentIndex],
          uri: result.uri,
        };
        return updatedAssets;
      });
    } catch (error) {
      console.error("Error manipulating image:", error);
      console.log("Error", "Failed to edit image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = useCallback(() => {
    if (!selectedAssets[currentImageIndex] || isProcessing) return;
    manipulateAsset(selectedAssets[currentImageIndex], currentImageIndex, {
      rotate: 90,
    });
  }, [selectedAssets, currentImageIndex, isProcessing]);

  const handleFlip = useCallback(() => {
    if (!selectedAssets[currentImageIndex] || isProcessing) return;
    manipulateAsset(selectedAssets[currentImageIndex], currentImageIndex, {
      flip: ImageManipulator.FlipType.Horizontal,
    });
  }, [selectedAssets, currentImageIndex, isProcessing]);

  const searchMusic = useCallback(async (query: string) => {
    try {
      if (query === "bollywood") {
        const queries = [
          "Bollywood hits",
          "new Bollywood songs",
          "Arijit Singh",
          "Pritam hits",
        ];
        const promises = queries.map((q) =>
          fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(
              q
            )}&entity=musicTrack&limit=5&country=in`
          ).then((res) => res.json())
        );
        const results = await Promise.all(promises);
        const allResults = results.flatMap((json) => json.results || []);
        setSearchResults(allResults);
      } else {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            query
          )}&entity=musicTrack&limit=20&country=in`
        );
        const json = await response.json();
        setSearchResults(json.results || []);
      }
    } catch (error) {
      console.error("Error fetching music:", error);
      console.log("Error", "Failed to fetch tracks");
    }
  }, []);

  useEffect(() => {
    try {
      if (selectedAssetsParam) {
        setSelectedAssets(JSON.parse(selectedAssetsParam));
      }
    } catch (error) {
      console.error("Error parsing selected assets:", error);
      console.log("Error", "Failed to load selected images");
    }
  }, [selectedAssetsParam]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (soundRef.current) {
          soundRef.current.unloadAsync();
        }
      };
    }, [])
  );

  useEffect(() => {
    if (showMusicModal && searchResults.length === 0) {
      searchMusic("bollywood");
    }
  }, [showMusicModal, searchResults.length, searchMusic]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMusic(searchQuery);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, searchMusic]);

  useEffect(() => {
    if (playingAudioUrl === selectedTrack?.previewUrl) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.pause();
      lottieRef.current?.reset();
    }
  }, [playingAudioUrl, selectedTrack]);

  const handleNext = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    router.push({
      pathname: "/(tabs)/posts/caption",
      params: {
        selectedAssets: JSON.stringify(selectedAssets),
        selectedTrack: selectedTrack ? JSON.stringify(selectedTrack) : null,
      },
    });
  }, [selectedAssets, selectedTrack, router]);

  return {
    state: {
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
    },
    handlers: {
      setSearchQuery,
      handleRotate,
      handleFlip,
      handleNext,
      playPausePreview,
      selectTrack,
      playPauseSelectedTrack,
      setShowMusicModal,
      removeSelectedTrack,
    },
    refs: {
      lottieRef,
    },
  };
};