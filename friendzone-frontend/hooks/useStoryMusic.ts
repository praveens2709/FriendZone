import { useEffect } from "react";
import { Audio } from "expo-av";

// Plays a story's song preview on loop while `playing` is true and cleans up on change/unmount.
export function useStoryMusic(previewUrl: string | undefined, playing: boolean) {
  useEffect(() => {
    if (!previewUrl || !playing) return;
    let cancelled = false;
    let sound: Audio.Sound | null = null;

    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const created = await Audio.Sound.createAsync({ uri: previewUrl }, { shouldPlay: true, isLooping: true });
        if (cancelled) {
          created.sound.unloadAsync().catch(() => undefined);
          return;
        }
        sound = created.sound;
      } catch {
        // A failed preview should never block the story.
      }
    })();

    return () => {
      cancelled = true;
      sound?.unloadAsync().catch(() => undefined);
    };
  }, [previewUrl, playing]);
}
