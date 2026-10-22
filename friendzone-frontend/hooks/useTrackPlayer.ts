import { useCallback, useEffect, useRef, useState } from "react";
import { Audio, AVPlaybackStatus } from "expo-av";

export type TrackPlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export const useTrackPlayer = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const tokenRef = useRef(0);
  const mountedRef = useRef(true);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<TrackPlayerStatus>("idle");
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const release = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
    sound.setOnPlaybackStatusUpdate(null);
    try {
      await sound.unloadAsync();
    } catch {}
  }, []);

  const stop = useCallback(async () => {
    tokenRef.current += 1;
    await release();
    if (!mountedRef.current) return;
    setActiveUrl(null);
    setStatus("idle");
    setPositionMs(0);
    setDurationMs(0);
  }, [release]);

  const play = useCallback(
    async (url: string) => {
      const token = ++tokenRef.current;
      await release();
      if (!mountedRef.current || token !== tokenRef.current) return;
      setActiveUrl(url);
      setStatus("loading");
      setPositionMs(0);
      setDurationMs(0);
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
        });
        const onStatus = (s: AVPlaybackStatus) => {
          if (token !== tokenRef.current || !mountedRef.current) return;
          if (!s.isLoaded) {
            if (s.error) setStatus("error");
            return;
          }
          setPositionMs(s.positionMillis || 0);
          setDurationMs(s.durationMillis || 0);
          if (s.didJustFinish) {
            setStatus("paused");
            setPositionMs(0);
            soundRef.current?.setPositionAsync(0).catch(() => {});
            return;
          }
          if (s.isPlaying) setStatus("playing");
          else if (s.isBuffering) setStatus("loading");
          else setStatus("paused");
        };
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, isLooping: false, progressUpdateIntervalMillis: 150 },
          onStatus
        );
        if (!mountedRef.current || token !== tokenRef.current) {
          sound.setOnPlaybackStatusUpdate(null);
          try {
            await sound.unloadAsync();
          } catch {}
          return;
        }
        soundRef.current = sound;
      } catch {
        if (mountedRef.current && token === tokenRef.current) setStatus("error");
      }
    },
    [release]
  );

  const toggle = useCallback(
    async (url: string) => {
      if (activeUrl !== url || status === "error") {
        await play(url);
        return;
      }
      const sound = soundRef.current;
      if (!sound || status === "loading") return;
      try {
        if (status === "playing") {
          setStatus("paused");
          await sound.pauseAsync();
        } else {
          setStatus("playing");
          await sound.playAsync();
        }
      } catch {
        setStatus("error");
      }
    },
    [activeUrl, status, play]
  );

  const seek = useCallback(
    async (fraction: number) => {
      const sound = soundRef.current;
      if (!sound || durationMs <= 0) return;
      const target = Math.max(0, Math.min(1, fraction)) * durationMs;
      setPositionMs(target);
      try {
        await sound.setPositionAsync(target);
      } catch {}
    },
    [durationMs]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tokenRef.current += 1;
      release();
    };
  }, [release]);

  return { activeUrl, status, positionMs, durationMs, play, stop, toggle, seek };
};
