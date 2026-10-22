import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import { createNotification, removePostNotifications } from './notificationController.js';
import User from '../models/User.js';
import Knock from '../models/Knock.js';
import Chat from '../models/Chat.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';
import { imageUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import {
  canViewUser,
  getAudienceIds,
  getBlockedIds,
  getFeedRelationIds,
  getViewableUserIds,
  emitToUsers,
} from '../services/privacyService.js';
import { cleanString, isObjectId } from '../utils/validate.js';
import { decoratePosts } from '../services/identityService.js';
import sharp from 'sharp';
import { saveMessage } from './chatController.js';

const USER_FIELDS = 'firstName lastName profileImage';
const MAX_FEED_LIMIT = 100;
const DELETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const addBlackBackground = async (buffer, size = 1080) => {
  return await sharp(buffer)
    .rotate()
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .jpeg()
    .toBuffer();
};

const parsePagination = (query, defaultLimit = 50) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), MAX_FEED_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

const parseSong = (raw) => {
  if (!raw) return { song: null };
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { error: 'Invalid song data format.' };
  }
  if (!parsed || typeof parsed !== 'object') return { error: 'Invalid song data format.' };

  const previewUrl = cleanString(parsed.previewUrl, 500);
  if (previewUrl && !/^https:\/\//i.test(previewUrl)) {
    return { error: 'Invalid song data format.' };
  }

  return {
    song: {
      trackName: cleanString(parsed.trackName, 200),
      artistName: cleanString(parsed.artistName, 200),
      previewUrl,
    },
  };
};

const loadViewablePost = async (req, res, postId) => {
  if (!isObjectId(postId)) {
    res.status(404).json({ message: 'Post not found.' });
    return null;
  }
  const post = await Post.findById(postId);
  const isOwner = post && post.user.toString() === req.user.id.toString();
  if (!post || post.deletedAt || (post.archived && !isOwner) || !(await canViewUser(req.user.id, post.user))) {
    res.status(404).json({ message: 'Post not found.' });
    return null;
  }
  return post;
};

export const createPost = [
  uploadLimiter,
  imageUpload.array('images', 10),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const io = req.app.get('socketio');

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No images provided.' });
      }

      const caption = cleanString(req.body.caption, 2200);
      const location = cleanString(req.body.location, 120);

      const { song, error } = parseSong(req.body.song);
      if (error) {
        return res.status(400).json({ message: error });
      }

      const uploadedImages = await Promise.all(
        req.files.map(async (file) => {
          const processedBuffer = await addBlackBackground(file.buffer);
          return uploadImageToCloudinary(processedBuffer, 'post_images');
        })
      );

      const newPost = new Post({
        user: userId,
        images: uploadedImages,
        caption,
        location,
        song,
      });

      await newPost.save();
      await newPost.populate('user', USER_FIELDS);

      const audience = await getAudienceIds(userId);
      emitToUsers(io, audience, 'newPost', newPost);

      res.status(201).json({ message: 'Post created successfully', post: newPost });
    } catch (error) {
      console.error('Error creating post:', error.message);
      res.status(500).json({ message: 'Server error during post creation.' });
    }
  },
];

export const getMyPosts = async (req, res) => {
  const { limit, skip } = parsePagination(req.query);
  try {
    const posts = await Post.find({ user: req.user.id, archived: { $ne: true }, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', USER_FIELDS)
      .populate('comments.user', USER_FIELDS);

    res.status(200).json(await decoratePosts(posts, req.user.id));
  } catch (error) {
    console.error("Error fetching user's posts:", error.message);
    res.status(500).json({ message: 'Server error fetching posts.' });
  }
};

export const getSavedPosts = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId).populate({
      path: 'savedPosts',
      populate: [
        { path: 'user', select: USER_FIELDS },
        { path: 'comments.user', select: USER_FIELDS },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = user.savedPosts.filter((post) => post !== null && !post.archived && !post.deletedAt);
    const viewable = await getViewableUserIds(
      userId,
      existing.map((post) => post.user._id)
    );
    const visible = existing.filter((post) => viewable.has(post.user._id.toString()));

    res.json(await decoratePosts(visible.reverse(), userId));
  } catch (error) {
    console.error('Error fetching saved posts:', error.message);
    res.status(500).json({ message: 'Server error fetching saved posts.' });
  }
};

export const getFeedPosts = async (req, res) => {
  const userId = req.user.id;
  const { limit, skip } = parsePagination(req.query);

  try {
    const [{ knockingIds, lockedInIds }, blocked] = await Promise.all([
      getFeedRelationIds(userId),
      getBlockedIds(userId),
    ]);

    const relevantUserIds = [...new Set([...knockingIds, ...lockedInIds])].filter(
      (id) => !blocked.has(id)
    );

    const posts = await Post.find({ user: { $in: relevantUserIds }, archived: { $ne: true }, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', USER_FIELDS)
      .populate('comments.user', USER_FIELDS)
      .lean();

    res.status(200).json(await decoratePosts(posts, userId));
  } catch (error) {
    console.error('Error fetching filtered posts:', error.message);
    res.status(500).json({ message: 'Server error fetching posts.' });
  }
};

export const getPostsByUserId = async (req, res) => {
  const { userId } = req.params;
  const { limit, skip } = parsePagination(req.query);

  if (!isObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user.' });
  }

  try {
    if (!(await canViewUser(req.user.id, userId))) {
      return res.status(200).json([]);
    }

    const posts = await Post.find({ user: userId, archived: { $ne: true }, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', USER_FIELDS)
      .populate('comments.user', USER_FIELDS);

    res.status(200).json(await decoratePosts(posts, req.user.id));
  } catch (error) {
    console.error('Error fetching user posts:', error.message);
    res.status(500).json({ message: 'Server error fetching user posts.' });
  }
};

export const getPostById = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await loadViewablePost(req, res, postId);
    if (!post) return;

    await post.populate([
      { path: 'user', select: USER_FIELDS },
      { path: 'comments.user', select: USER_FIELDS },
    ]);

    const [decorated] = await decoratePosts([post], req.user.id);
    res.status(200).json(decorated);
  } catch (error) {
    console.error('Error fetching post:', error.message);
    res.status(500).json({ message: 'Server error fetching post.' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const text = cleanString(req.body?.text, 1000);
    const userId = req.user.id;
    const io = req.app.get('socketio');

    if (!text) return res.status(400).json({ message: 'Comment text is required.' });

    const post = await loadViewablePost(req, res, postId);
    if (!post) return;

    post.comments.push({ user: userId, text });
    await post.save();

    const addedComment = post.comments[post.comments.length - 1];
    const user = await User.findById(userId).select(USER_FIELDS);

    const populatedComment = {
      ...addedComment.toObject(),
      user: user.toObject(),
    };

    const audience = await getAudienceIds(post.user);
    emitToUsers(io, audience, 'newComment', { postId, comment: populatedComment });

    if (post.user.toString() !== userId.toString()) {
      const excerpt = text.length > 60 ? `${text.slice(0, 57)}...` : text;
      await createNotification({
        recipientId: post.user,
        senderId: userId,
        type: 'post_comment',
        content: `commented on your post: "${excerpt}"`,
        relatedEntityId: post._id,
        relatedEntityType: 'Post',
        metadata: { postId: postId.toString() },
        io,
      });
    }

    res.status(201).json({ message: 'Comment added successfully', comment: populatedComment });
  } catch (error) {
    console.error('Error adding comment:', error.message);
    res.status(500).json({ message: 'Server error during comment creation.' });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await loadViewablePost(req, res, postId);
    if (!post) return;

    const hasLiked = post.likes.some((id) => id.toString() === userId.toString());
    const updated = await Post.findByIdAndUpdate(
      postId,
      hasLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
      { new: true }
    );

    const io = req.app.get('socketio');
    const ownerId = post.user.toString();
    if (ownerId !== userId.toString()) {
      const likeFilter = { recipient: post.user, sender: userId, type: 'post_like', relatedEntityId: post._id };
      if (hasLiked) {
        await removePostNotifications({ postId: post._id, recipientId: post.user, senderId: userId, type: 'post_like' }, io);
      } else if (!(await Notification.exists(likeFilter))) {
        await createNotification({
          recipientId: post.user,
          senderId: userId,
          type: 'post_like',
          content: 'liked your post.',
          relatedEntityId: post._id,
          relatedEntityType: 'Post',
          metadata: { postId: postId.toString() },
          io,
        });
      }
    }

    const audience = await getAudienceIds(post.user);
    emitToUsers(io, audience, 'postLikeUpdated', {
      postId,
      userId: userId.toString(),
      liked: !hasLiked,
      likesCount: updated.likes.length,
    });

    res.json({ success: true, liked: !hasLiked, likesCount: updated.likes.length });
  } catch (error) {
    console.error('Error toggling like:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const toggleSave = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await loadViewablePost(req, res, postId);
    if (!post) return;

    const hasSaved = post.saves.some((id) => id.toString() === userId.toString());

    const [updatedPost] = await Promise.all([
      Post.findByIdAndUpdate(
        postId,
        hasSaved ? { $pull: { saves: userId } } : { $addToSet: { saves: userId } },
        { new: true }
      ),
      User.updateOne(
        { _id: userId },
        hasSaved ? { $pull: { savedPosts: postId } } : { $addToSet: { savedPosts: postId } }
      ),
    ]);

    res.json({
      success: true,
      saved: !hasSaved,
      savesCount: updatedPost.saves.length,
    });
  } catch (error) {
    console.error('Error toggling save:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const sharePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await loadViewablePost(req, res, postId);
    if (!post) return;

    const updated = await Post.findByIdAndUpdate(postId, { $inc: { shares: 1 } }, { new: true });

    res.json({ success: true, shares: updated.shares });
  } catch (error) {
    console.error('Error sharing post:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const sharePostToChat = async (req, res) => {
  const { postId } = req.params;
  const { chatId } = req.body || {};
  const note = cleanString(req.body?.message, 500);

  if (!isObjectId(chatId)) {
    return res.status(400).json({ message: 'Invalid chat.' });
  }

  try {
    const post = await loadViewablePost(req, res, postId);
    if (!post) return;

    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    const common = { chatId, senderId: req.user.id, io, userSocketMap };

    const saved = await saveMessage({ ...common, text: 'Shared a post', sharedPostId: post._id });
    if (!saved) return res.status(404).json({ message: 'Chat not found.' });
    if (saved.error) return res.status(403).json({ message: saved.error });

    if (note) await saveMessage({ ...common, text: note });

    await Post.updateOne({ _id: post._id }, { $inc: { shares: 1 } });

    res.status(200).json({ success: true, message: 'Post shared to chat successfully.' });
  } catch (error) {
    console.error('Error sharing post to chat:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getArchivedPosts = async (req, res) => {
  const { limit, skip } = parsePagination(req.query);
  try {
    const posts = await Post.find({ user: req.user.id, archived: true, deletedAt: null })
      .sort({ archivedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', USER_FIELDS)
      .populate('comments.user', USER_FIELDS);

    res.json(await decoratePosts(posts, req.user.id));
  } catch (error) {
    console.error('Error fetching archived posts:', error.message);
    res.status(500).json({ message: 'Server error fetching archived posts.' });
  }
};

const setArchived = (archived) => async (req, res) => {
  const { postId } = req.params;
  if (!isObjectId(postId)) return res.status(404).json({ message: 'Post not found.' });

  try {
    const post = await Post.findOneAndUpdate(
      { _id: postId, user: req.user.id },
      { $set: { archived, archivedAt: archived ? new Date() : null } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    const audience = await getAudienceIds(post.user);
    emitToUsers(req.app.get('socketio'), audience, archived ? 'postRemoved' : 'postRestored', { postId });
    res.json({ success: true, archived: post.archived });
  } catch (error) {
    console.error('Error archiving post:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const archivePost = setArchived(true);
export const unarchivePost = setArchived(false);

export const deletePost = async (req, res) => {
  const { postId } = req.params;
  if (!isObjectId(postId)) return res.status(404).json({ message: 'Post not found.' });

  try {
    const post = await Post.findOneAndUpdate(
      { _id: postId, user: req.user.id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    await removePostNotifications({ postId: post._id }, req.app.get('socketio'));
    const audience = await getAudienceIds(post.user);
    emitToUsers(req.app.get('socketio'), audience, 'postRemoved', { postId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getDeletedPosts = async (req, res) => {
  const { limit, skip } = parsePagination(req.query);
  try {
    const posts = await Post.find({ user: req.user.id, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', USER_FIELDS);

    res.json(
      (await decoratePosts(posts, req.user.id)).map((p) => ({
        ...p,
        daysLeft: Math.max(
          0,
          Math.ceil((new Date(p.deletedAt).getTime() + DELETED_RETENTION_MS - Date.now()) / 86400000)
        ),
      }))
    );
  } catch (error) {
    console.error('Error fetching deleted posts:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const restorePost = async (req, res) => {
  const { postId } = req.params;
  if (!isObjectId(postId)) return res.status(404).json({ message: 'Post not found.' });

  try {
    const post = await Post.findOneAndUpdate(
      { _id: postId, user: req.user.id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    const audience = await getAudienceIds(post.user);
    emitToUsers(req.app.get('socketio'), audience, 'postRestored', { postId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error restoring post:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const deletePostForever = async (req, res) => {
  const { postId } = req.params;
  if (!isObjectId(postId)) return res.status(404).json({ message: 'Post not found.' });

  try {
    const post = await Post.findOneAndDelete({ _id: postId, user: req.user.id, deletedAt: { $ne: null } });
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    await Promise.all(post.images.map((image) => deleteImageFromCloudinary(image.public_id)));
    await User.updateMany({ savedPosts: post._id }, { $pull: { savedPosts: post._id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error permanently deleting post:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const purgeExpiredDeletedPosts = async () => {
  try {
    const cutoff = new Date(Date.now() - DELETED_RETENTION_MS);
    const expired = await Post.find({ deletedAt: { $ne: null, $lte: cutoff } }).limit(100);
    for (const post of expired) {
      await Promise.all(post.images.map((image) => deleteImageFromCloudinary(image.public_id)));
      await User.updateMany({ savedPosts: post._id }, { $pull: { savedPosts: post._id } });
      await Post.deleteOne({ _id: post._id });
    }
    return expired.length;
  } catch (error) {
    console.error('Purge of deleted posts failed:', error.message);
    return 0;
  }
};

const activityPosts = (filter) => async (req, res) => {
  const { limit, skip } = parsePagination(req.query);
  const viewerId = req.user.id;
  try {
    const posts = await Post.find({ ...filter(viewerId), archived: { $ne: true }, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 10)
      .populate('user', USER_FIELDS)
      .populate('comments.user', USER_FIELDS);

    const withAuthors = posts.filter((p) => p.user);
    const viewable = await getViewableUserIds(viewerId, withAuthors.map((p) => p.user._id));
    const visible = withAuthors.filter((p) => viewable.has(p.user._id.toString())).slice(0, limit);

    res.json(await decoratePosts(visible, viewerId));
  } catch (error) {
    console.error('Error fetching activity posts:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getLikedPosts = activityPosts((viewerId) => ({ likes: viewerId }));
export const getCommentedPosts = activityPosts((viewerId) => ({ 'comments.user': viewerId }));
