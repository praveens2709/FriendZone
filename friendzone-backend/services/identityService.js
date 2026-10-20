import Vibe from '../models/Vibe.js';
import User from '../models/User.js';
import { getLockedInIds } from './privacyService.js';

export const getCircleSet = async (viewerId) => new Set(await getLockedInIds(viewerId));

export const getActiveVibes = async (userIds) => {
  if (!userIds.length) return new Map();
  const vibes = await Vibe.find({ user: { $in: userIds }, expiresAt: { $gt: new Date() } }).lean();
  return new Map(
    vibes.map((v) => [v.user.toString(), { kind: v.kind, note: v.note, expiresAt: v.expiresAt }])
  );
};

export const decoratePosts = async (posts, viewerId) => {
  const plain = posts
    .map((p) => (typeof p.toObject === 'function' ? p.toObject() : p))
    .filter((p) => p.user)
    .map((p) => ({ ...p, comments: (p.comments || []).filter((c) => c.user) }));
  const viewer = viewerId.toString();
  const ids = [...new Set(plain.map((p) => p.user?._id?.toString()).filter(Boolean))];
  const circle = await getCircleSet(viewerId);
  const visible = ids.filter((id) => id === viewer || circle.has(id));
  const vibes = await getActiveVibes(visible);

  const likerIds = [
    ...new Set(
      plain.flatMap((p) => (p.likes || []).map(String)).filter((id) => id !== viewer && circle.has(id))
    ),
  ];
  const likers = likerIds.length
    ? await User.find({ _id: { $in: likerIds } }).select('firstName').lean()
    : [];
  const likerName = new Map(likers.map((u) => [u._id.toString(), u.firstName]));

  return plain.map((p) => {
    const id = p.user?._id?.toString();
    if (!id) return p;
    const friendNames = (p.likes || [])
      .map(String)
      .filter((likeId) => likeId !== viewer && circle.has(likeId))
      .map((likeId) => likerName.get(likeId))
      .filter(Boolean)
      .slice(0, 2);
    return {
      ...p,
      likedByNames: friendNames,
      user: {
        ...p.user,
        isLockedIn: id !== viewer && circle.has(id),
        vibe: vibes.get(id) || null,
      },
    };
  });
};
