import Story from '../models/Story.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';
import { canViewUser, emitToUsers, getAudienceIds, getVisibleAuthorIds, isBlockedBetween } from '../services/privacyService.js';
import * as NotificationController from './notificationController.js';
import { cleanString, isObjectId } from '../utils/validate.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const USER_FIELDS = 'firstName lastName profileImage';
const COLOR = /^#[0-9a-fA-F]{6}$/;

const FONTS = ['classic', 'modern', 'strong', 'serif', 'mono', 'script'];
const BGS = ['none', 'solid', 'soft'];
const ALIGNS = ['left', 'center', 'right'];
const PREVIEW_HOSTS = /^https:\/\/[a-z0-9.-]+\.(mzstatic\.com|itunes\.apple\.com)\//i;

const parseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readTextStyle = (raw) => {
  const input = parseJson(raw);
  if (!input) return undefined;
  const size = parseFloat(input.size);
  return {
    font: FONTS.includes(input.font) ? input.font : 'modern',
    size: Number.isFinite(size) ? Math.min(Math.max(size, 12), 72) : 28,
    color: COLOR.test(input.color) ? input.color : '#FFFFFF',
    bg: BGS.includes(input.bg) ? input.bg : 'soft',
    align: ALIGNS.includes(input.align) ? input.align : 'center',
  };
};

// Only song previews from Apple's own CDN are accepted so clients can't make
// other viewers' phones fetch arbitrary URLs.
const readMusic = (raw) => {
  const input = parseJson(raw);
  if (!input || typeof input.previewUrl !== 'string' || !PREVIEW_HOSTS.test(input.previewUrl)) return undefined;
  const artwork = typeof input.artwork === 'string' && PREVIEW_HOSTS.test(input.artwork) ? input.artwork : '';
  return {
    title: cleanString(input.title, 120) || 'Unknown song',
    artist: cleanString(input.artist, 120),
    artwork,
    previewUrl: input.previewUrl,
  };
};

const FILTERS = ['none', 'warm', 'cool', 'rose', 'sunset', 'fade', 'night'];
const STICKER_KINDS = ['emoji', 'mention', 'time'];
const clamp = (value, min, max, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

const readStickers = (raw) => {
  const input = parseJson(raw);
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && STICKER_KINDS.includes(item.kind))
    .slice(0, 20)
    .map((item) => ({
      kind: item.kind,
      text: cleanString(item.text, 60),
      userId: item.kind === 'mention' && isObjectId(String(item.userId)) ? item.userId : undefined,
      x: clamp(item.x, 0, 1, 0.5),
      y: clamp(item.y, 0, 1, 0.5),
      scale: clamp(item.scale, 0.3, 6, 1),
      rotation: clamp(item.rotation, -360, 360, 0),
    }))
    .filter((item) => item.text && (item.kind !== 'mention' || item.userId));
};

const readDrawing = (raw) => {
  const input = parseJson(raw);
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 60)
    .map((stroke) => ({
      color: COLOR.test(stroke?.color) ? stroke.color : '#FFFFFF',
      width: clamp(stroke?.width, 0.002, 0.08, 0.01),
      points: (Array.isArray(stroke?.points) ? stroke.points : [])
        .slice(0, 800)
        .map((n) => clamp(n, 0, 1, 0)),
    }))
    .filter((stroke) => stroke.points.length >= 2);
};

const serialize = (story, viewerId) => {
  const isOwner = story.user.toString() === viewerId;
  return {
    id: story._id.toString(),
    type: story.type,
    url: story.mediaUrl || null,
    text: story.text || '',
    gradient: story.gradient,
    textColor: story.textColor,
    textX: story.textX ?? 0.5,
    textY: story.textY ?? 0.5,
    stickers: (story.stickers || []).map((item) => ({
      kind: item.kind,
      text: item.text,
      userId: item.userId ? item.userId.toString() : null,
      x: item.x,
      y: item.y,
      scale: item.scale,
      rotation: item.rotation,
    })),
    drawing: story.drawing || [],
    filter: story.filter || 'none',
    textStyle: story.textStyle?.font ? story.textStyle : null,
    music: story.music?.previewUrl ? story.music : null,
    post: story.type === 'post' && story.post?.image
      ? {
          id: story.post.postId?.toString() || null,
          image: story.post.image,
          authorName: story.post.authorName || '',
          authorAvatar: story.post.authorAvatar || null,
          caption: story.post.caption || '',
        }
      : null,
    backdrop: story.backdrop || '',
    cardX: story.cardX ?? 0.5,
    cardY: story.cardY ?? 0.5,
    cardScale: story.cardScale ?? 1,
    duration: story.duration,
    audience: story.audience,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    viewed: isOwner || story.viewers.some((v) => v.user.toString() === viewerId),
    viewCount: isOwner ? story.viewers.length : undefined,
  };
};

const canSee = (story, viewerId, authorCloseSet) => {
  if (story.user.toString() === viewerId) return true;
  if (story.audience === 'close') return authorCloseSet?.has(viewerId) ?? false;
  return true;
};

export const createStory = async (req, res) => {
  const userId = req.user.id;
  const audience = req.body?.audience === 'close' ? 'close' : 'circle';
  const text = cleanString(req.body?.text, 300);

  try {
    let type = req.body?.type;
    const data = { user: userId, audience, expiresAt: new Date(Date.now() + DAY_MS) };
    const textStyle = readTextStyle(req.body?.textStyle);
    const music = readMusic(req.body?.music);
    if (textStyle) data.textStyle = textStyle;
    if (music) data.music = music;
    if (type !== 'text') {
      data.stickers = readStickers(req.body?.stickers);
      data.drawing = readDrawing(req.body?.drawing);
      data.filter = FILTERS.includes(req.body?.filter) ? req.body.filter : 'none';
    }

    if (req.file?.buffer) {
      const isVideo = req.file.mimetype.startsWith('video/');
      type = isVideo ? 'video' : 'image';
      const uploaded = await uploadImageToCloudinary(req.file.buffer, 'stories');
      Object.assign(data, {
        type,
        mediaUrl: uploaded.url,
        publicId: uploaded.public_id,
        resourceType: uploaded.resource_type || (isVideo ? 'video' : 'image'),
        text,
        textX: Math.min(Math.max(parseFloat(req.body?.textX) || 0.5, 0.05), 0.95),
        textY: Math.min(Math.max(parseFloat(req.body?.textY) || 0.5, 0.08), 0.92),
        duration: isVideo
          ? Math.min(Math.max(parseInt(req.body?.duration, 10) || 10000, 2000), 30000)
          : 5000,
      });
    } else if (type === 'post') {
      const postId = req.body?.postId;
      const post = isObjectId(String(postId))
        ? await Post.findById(postId).populate('user', `${USER_FIELDS} isPrivate`)
        : null;
      const isOwnPost = post && post.user._id.toString() === userId.toString();
      if (!post || post.deletedAt || (post.archived && !isOwnPost) || !(await canViewUser(userId, post.user._id))) {
        return res.status(404).json({ message: 'That post is no longer available.' });
      }
      if (post.user.isPrivate && !isOwnPost) {
        return res.status(403).json({ message: "Posts from private accounts can't be added to a story." });
      }
      let gradient = [];
      try {
        const parsed = typeof req.body.gradient === 'string' ? JSON.parse(req.body.gradient) : req.body.gradient;
        gradient = Array.isArray(parsed) ? parsed.filter((c) => COLOR.test(c)).slice(0, 3) : [];
      } catch {
        gradient = [];
      }
      const num = (value, min, max, fallback) => {
        const n = parseFloat(value);
        return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
      };
      Object.assign(data, {
        type: 'post',
        post: {
          postId: post._id,
          image: post.images?.[0]?.url,
          authorName: `${post.user.firstName} ${post.user.lastName || ''}`.trim(),
          authorAvatar: post.user.profileImage || '',
          caption: (post.caption || '').slice(0, 200),
        },
        gradient: gradient.length >= 2 ? gradient : ['#1F1F1F', '#3A3A3A'],
        text,
        textX: num(req.body?.textX, 0.05, 0.95, 0.5),
        textY: num(req.body?.textY, 0.08, 0.92, 0.5),
        backdrop: ['moon', 'sunny', 'water', 'leaf', 'heart', 'rocket'].includes(req.body?.backdrop) ? req.body.backdrop : '',
        cardX: num(req.body?.cardX, 0, 1, 0.5),
        cardY: num(req.body?.cardY, 0, 1, 0.5),
        cardScale: num(req.body?.cardScale, 0.4, 3, 1),
        duration: 6000,
      });
    } else {
      if (type !== 'text' || !text) {
        return res.status(400).json({ message: 'Add a photo, a video or some text.' });
      }
      let gradient = [];
      try {
        const parsed = typeof req.body.gradient === 'string' ? JSON.parse(req.body.gradient) : req.body.gradient;
        gradient = Array.isArray(parsed) ? parsed.filter((c) => COLOR.test(c)).slice(0, 3) : [];
      } catch {
        gradient = [];
      }
      Object.assign(data, {
        type: 'text',
        text,
        gradient: gradient.length >= 2 ? gradient : ['#1F1F1F', '#3A3A3A'],
        textColor: COLOR.test(req.body?.textColor) ? req.body.textColor : '#FFFFFF',
        duration: Math.min(Math.max(2500 + text.length * 60, 4000), 10000),
      });
    }

    const story = await Story.create(data);

    const mentioned = [
      ...new Set(story.stickers.filter((item) => item.kind === 'mention' && item.userId).map((item) => item.userId.toString())),
    ]
      .filter((id) => id !== String(userId))
      .slice(0, 5);
    for (const recipientId of mentioned) {
      if (await isBlockedBetween(userId, recipientId)) continue;
      await NotificationController.createNotification({
        recipientId,
        senderId: userId,
        type: 'activity',
        content: 'mentioned you in their story.',
        relatedEntityId: userId,
        relatedEntityType: 'User',
        io: req.app.get('socketio'),
      });
    }

    const watchers = await getAudienceIds(userId);
    emitToUsers(req.app.get('socketio'), watchers, 'storiesChanged', { userId });

    res.status(201).json(serialize(story, userId));
  } catch (error) {
    console.error('Error creating story:', error.message);
    res.status(500).json({ message: 'Could not post your story.' });
  }
};

export const getStories = async (req, res) => {
  const viewerId = req.user.id;

  try {
    const visibleIds = await getVisibleAuthorIds(viewerId);
    const authorIds = [viewerId, ...visibleIds];

    const [stories, authors] = await Promise.all([
      Story.find({ user: { $in: authorIds }, expiresAt: { $gt: new Date() } })
        .sort({ createdAt: 1 })
        .lean(),
      User.find({ _id: { $in: authorIds } }).select(`${USER_FIELDS} closeFriends`).lean(),
    ]);

    const authorById = new Map(authors.map((a) => [a._id.toString(), a]));
    const groups = new Map();

    for (const story of stories) {
      const authorId = story.user.toString();
      const author = authorById.get(authorId);
      if (!author) continue;
      const closeSet = new Set((author.closeFriends || []).map(String));
      if (!canSee(story, viewerId, closeSet)) continue;

      if (!groups.has(authorId)) {
        groups.set(authorId, {
          user: {
            id: authorId,
            name: `${author.firstName} ${author.lastName || ''}`.trim(),
            profileImage: author.profileImage || null,
          },
          isOwn: authorId === viewerId,
          stories: [],
        });
      }
      groups.get(authorId).stories.push(serialize(story, viewerId));
    }

    const result = [...groups.values()].map((g) => ({ ...g, hasUnseen: g.stories.some((s) => !s.viewed) }));
    result.sort((a, b) => {
      if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
      if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
      const lastA = new Date(a.stories.at(-1).createdAt).getTime();
      const lastB = new Date(b.stories.at(-1).createdAt).getTime();
      return lastB - lastA;
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching stories:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const viewStory = async (req, res) => {
  const { id } = req.params;
  const viewerId = req.user.id;
  if (!isObjectId(id)) return res.status(404).json({ message: 'Story not found.' });

  try {
    const story = await Story.findOne({ _id: id, expiresAt: { $gt: new Date() } });
    if (!story) return res.status(404).json({ message: 'Story not found.' });
    if (story.user.toString() === viewerId) return res.json({ success: true });

    const visibleIds = new Set(await getVisibleAuthorIds(viewerId));
    if (!visibleIds.has(story.user.toString())) return res.status(404).json({ message: 'Story not found.' });

    if (story.audience === 'close') {
      const author = await User.findById(story.user).select('closeFriends').lean();
      if (!(author?.closeFriends || []).some((c) => c.toString() === viewerId)) {
        return res.status(404).json({ message: 'Story not found.' });
      }
    }

    const viewedAt = new Date();
    const update = await Story.updateOne(
      { _id: id, 'viewers.user': { $ne: viewerId } },
      { $push: { viewers: { user: viewerId, at: viewedAt } } }
    );

    if (update.modifiedCount > 0) {
      const [viewer, fresh] = await Promise.all([
        User.findById(viewerId).select(USER_FIELDS).lean(),
        Story.findById(id).select('viewers').lean(),
      ]);
      const io = req.app.get('socketio');
      if (io && viewer) {
        io.to(`notifications-${story.user}`).emit('storyViewed', {
          storyId: id,
          viewCount: fresh?.viewers?.length ?? 0,
          viewer: {
            id: viewer._id.toString(),
            name: `${viewer.firstName} ${viewer.lastName || ''}`.trim(),
            profileImage: viewer.profileImage || null,
            at: viewedAt,
          },
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error viewing story:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getViewers = async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) return res.status(404).json({ message: 'Story not found.' });

  try {
    const story = await Story.findOne({ _id: id, user: req.user.id }).populate('viewers.user', USER_FIELDS).lean();
    if (!story) return res.status(404).json({ message: 'Story not found.' });

    res.json(
      story.viewers
        .filter((v) => v.user)
        .map((v) => ({
          id: v.user._id.toString(),
          name: `${v.user.firstName} ${v.user.lastName || ''}`.trim(),
          profileImage: v.user.profileImage || null,
          at: v.at,
        }))
        .sort((a, b) => new Date(b.at) - new Date(a.at))
    );
  } catch (error) {
    console.error('Error fetching viewers:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const deleteStory = async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) return res.status(404).json({ message: 'Story not found.' });

  try {
    const story = await Story.findOneAndDelete({ _id: id, user: req.user.id });
    if (!story) return res.status(404).json({ message: 'Story not found.' });
    if (story.publicId) deleteImageFromCloudinary(story.publicId, story.resourceType || 'image');

    const watchers = await getAudienceIds(req.user.id);
    emitToUsers(req.app.get('socketio'), watchers, 'storiesChanged', { userId: req.user.id });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting story:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const cleanupExpiredStories = async () => {
  try {
    const expired = await Story.find({ expiresAt: { $lte: new Date() } }).select('publicId resourceType').limit(200).lean();
    if (!expired.length) return 0;
    await Promise.all(
      expired.filter((s) => s.publicId).map((s) => deleteImageFromCloudinary(s.publicId, s.resourceType || 'image'))
    );
    await Story.deleteMany({ _id: { $in: expired.map((s) => s._id) } });
    return expired.length;
  } catch (error) {
    console.error('Story cleanup failed:', error.message);
    return 0;
  }
};
