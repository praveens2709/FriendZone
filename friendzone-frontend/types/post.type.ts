import { User } from "./user.type";

export interface Image {
  url: string;
  public_id: string;
}

export interface Song {
  trackName: string;
  artistName: string;
  previewUrl: string;
}

export interface Comment {
  _id: string;
  user: User;
  text: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  user: User;
  images: Image[];
  caption: string;
  location?: string;
  song?: Song;
  likes: string[];
  saves: string[];
  shares: number;
  comments: Comment[];
  createdAt: string;
}

// API Response wrappers
export interface ICreatePostResponse {
  message: string;
  post: Post;
}

export interface IGetPostsResponse extends Array<Post> {}

export interface IAddCommentResponse {
  message: string;
  comment: Comment;
}

export interface IToggleLikeResponse {
  success: boolean;
  liked: boolean;
  likesCount: number;
}

export interface IToggleSaveResponse {
  success: boolean;
  saved: boolean;
  savesCount: number;
}

export interface ISharePostResponse {
  success: boolean;
  shares: number;
}