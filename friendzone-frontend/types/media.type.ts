export interface MediaAsset {
  id: string;
  uri: string;
  width?: number;
  height?: number;
}

export interface Track {
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl100: string;
}