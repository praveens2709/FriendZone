import { _get, _post } from "../configs/api-methods.config";
import { Post, Comment, IToggleSaveResponse, ISharePostResponse, IToggleLikeResponse } from "@/types/post.type";

interface ICreatePostResponse {
  message: string;
  post: Post;
}

interface IGetPostsResponse extends Array<Post> {}

interface IAddCommentResponse {
  message: string;
  comment: Comment;
}

class PostService {
  static async createPost(formData: FormData, token: string): Promise<Post> {
    try {
      const response = await _post<ICreatePostResponse>("posts", formData, token);
      return response.post;
    } catch (error) {
      console.error("Error while creating post:", error);
      throw error;
    }
  }

  static async getPosts(token?: string): Promise<Post[]> {
    try {
      const response = await _get<IGetPostsResponse>("posts/my-posts", token);
      return response;
    } catch (error) {
      console.error("Error while fetching posts:", error);
      throw error;
    }
  }
  
  static async getPostById(token: string, postId: string): Promise<Post> {
    try {
      const response = await _get<Post>(`posts/${postId}`, token);
      return response;
    } catch (error) {
      console.error("Error while fetching single post:", error);
      throw error;
    }
  }
  
  static async getPostsByUserId(token: string, userId: string): Promise<Post[]> {
    try {
      const response = await _get<IGetPostsResponse>(`posts/user/${userId}`, token);
      return response;
    } catch (error) {
      console.error("Error while fetching user posts:", error);
      throw error;
    }
  }

  static async getFeedPosts(token: string): Promise<Post[]> {
    try {
      const response = await _get<IGetPostsResponse>("posts/", token);
      return response;
    } catch (error) {
      console.error("Error while fetching feed posts:", error);
      throw error;
    }
  }

  static async addComment(postId: string, text: string, token: string): Promise<Comment> {
    try {
      const response = await _post<IAddCommentResponse>(
        `posts/${postId}/comments`,
        { text },
        token
      );
      return response.comment;
    } catch (error) {
      console.error("Error while adding comment:", error);
      throw error;
    }
  }

  static async toggleLike(postId: string, token: string): Promise<IToggleLikeResponse> {
    try {
      return await _post<IToggleLikeResponse>(`posts/${postId}/like`, {}, token);
    } catch (error) {
      console.error("Error while toggling like:", error);
      throw error;
    }
  }
  
  static async toggleSave(postId: string, token: string): Promise<IToggleSaveResponse> {
    try {
      return await _post<IToggleSaveResponse>(`posts/${postId}/save`, {}, token);
    } catch (error) {
      console.error("Error while toggling save:", error);
      throw error;
    }
  }

  static async sharePost(postId: string, token: string): Promise<ISharePostResponse> {
    try {
      return await _post<ISharePostResponse>(`posts/${postId}/share-count`, {}, token);
    } catch (error) {
      console.error("Error while sharing post:", error);
      throw error;
    }
  }

  static async sharePostToChat(postId: string, chatId: string, token: string): Promise<void> {
  try {
    await _post(`posts/${postId}/share-to-chat`, { chatId }, token);
  } catch (error) {
    console.error("Error while sharing post to chat:", error);
    throw error;
  }
}
}

export default PostService;