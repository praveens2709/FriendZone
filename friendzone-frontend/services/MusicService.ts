import { StoryMusic } from "@/constants/storyText";

type ITunesTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  previewUrl?: string;
};

// iTunes Search needs no key and returns 30 second previews, which fit a story.
const SEARCH_URL = "https://itunes.apple.com/search";

class MusicService {
  static async search(term: string, signal?: AbortSignal): Promise<StoryMusic[]> {
    const query = term.trim() || "top hits";
    const response = await fetch(
      `${SEARCH_URL}?media=music&entity=song&limit=25&term=${encodeURIComponent(query)}`,
      { signal }
    );
    if (!response.ok) throw new Error("Music search failed");
    const body = (await response.json()) as { results: ITunesTrack[] };
    return body.results
      .filter((track) => !!track.previewUrl)
      .map((track) => ({
        title: track.trackName,
        artist: track.artistName,
        artwork: track.artworkUrl100?.replace("100x100", "200x200"),
        previewUrl: track.previewUrl as string,
      }));
  }
}

export default MusicService;
