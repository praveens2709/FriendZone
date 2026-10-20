import Story from '../models/Story.js';
import User from '../models/User.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';
import { emitToUsers, getLockedInIds } from '../services/privacyService.js';
import { cleanString, isObjectId } from '../utils/validate.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const USER_FIELDS = 'firstName lastName profileImage';
const COLOR = /^#[0-9a-fA-F]{6}$/;

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

    const circle = await getLockedInIds(userId);
    emitToUsers(req.app.get('socketio'), circle, 'storiesChanged', { userId });

    res.status(201).json(serialize(story, userId));
  } catch (error) {
    console.error('Error creating story:', error.message);
    res.status(500).json({ message: 'Could not post your story.' });
  }
};

export const getStories = async (req, res) => {
  const viewerId = req.user.id;

  try {
    const friendIds = await getLockedInIds(viewerId);
    const authorIds = [viewerId, ...friendIds];

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

    const friendIds = new Set(await getLockedInIds(viewerId));
    if (!friendIds.has(story.user.toString())) return res.status(404).json({ message: 'Story not found.' });

    if (story.audience === 'close') {
      const author = await User.findById(story.user).select('closeFriends').lean();
      if (!(author?.closeFriends || []).some((c) => c.toString() === viewerId)) {
        return res.status(404).json({ message: 'Story not found.' });
      }
    }

    await Story.updateOne(
      { _id: id, 'viewers.user': { $ne: viewerId } },
      { $push: { viewers: { user: viewerId, at: new Date() } } }
    );
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

    const circle = await getLockedInIds(req.user.id);
    emitToUsers(req.app.get('socketio'), circle, 'storiesChanged', { userId: req.user.id });

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
