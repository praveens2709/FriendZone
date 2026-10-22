import { _get, _post } from "../configs/api-methods.config";
import httpClient from "../configs/axios.config";
import { Post, Comment, IToggleSaveResponse, ISharePostResponse, IToggleLikeResponse } from "@/types/post.type";

interface ICreatePostResponse {
  message: string;
  post: Post;
}

interface IGetPostsResponse extends Array<Post> { }

interface IAddCommentResponse {
  message: string;
  comment: Comment;
}

class PostService {
  static async getArchivedPosts(token: string, page = 1): Promise<Post[]> {
    return await _get<IGetPostsResponse>(`posts/archived?page=${page}`, token);
  }

  static async archivePost(postId: string): Promise<void> {
    await httpClient.put(`posts/${postId}/archive`, {});
  }

  static async unarchivePost(postId: string): Promise<void> {
    await httpClient.put(`posts/${postId}/unarchive`, {});
  }

  static async deletePost(postId: string): Promise<void> {
    await httpClient.delete(`posts/${postId}`);
  }

  static async getDeletedPosts(token: string): Promise<(Post & { daysLeft: number })[]> {
    return await _get(`posts/deleted`, token);
  }

  static async restorePost(postId: string): Promise<void> {
    await httpClient.put(`posts/${postId}/restore`, {});
  }

  static async deletePostForever(postId: string): Promise<void> {
    await httpClient.delete(`posts/${postId}/permanent`);
  }

  static async getLikedPosts(token: string, page = 1): Promise<Post[]> {
    return await _get<IGetPostsResponse>(`posts/activity/liked?page=${page}`, token);
  }

  static async getCommentedPosts(token: string, page = 1): Promise<Post[]> {
    return await _get<IGetPostsResponse>(`posts/activity/commented?page=${page}`, token);
  }

  static async getSavedPosts(token: string): Promise<Post[]> {
    try {
      const response = await _get<IGetPostsResponse>("posts/saved", token);
      return response;
    } catch (error) {
      console.error("Error fetching saved posts:", error);
      throw error;
    }
  }

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

  static async getFeedPosts(token: string, page = 1, limit = 12): Promise<Post[]> {
    try {
      const response = await _get<IGetPostsResponse>(`posts/?page=${page}&limit=${limit}`, token);
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

  static async sharePostToChat(
    postId: string,
    chatId: string,
    token: string,
    message?: string
  ): Promise<void> {
    await _post(`posts/${postId}/share-to-chat`, { chatId, message }, token);
  }
}

export default PostService;