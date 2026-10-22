export interface MediaAsset {
  id: string;
  uri: string;
  width?: number;
  height?: number;
}

export interface EditableAsset extends MediaAsset {
  originalUri: string;
  rotation: number;
  flipped: boolean;
}

export interface Track {
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl100: string;
}
