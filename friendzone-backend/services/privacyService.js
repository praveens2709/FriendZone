import Block from '../models/Block.js';
import Knock from '../models/Knock.js';
import User from '../models/User.js';

export const getBlockedIds = async (userId) => {
  const blocks = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  })
    .select('blocker blocked')
    .lean();

  const ids = new Set();
  for (const block of blocks) {
    const other =
      block.blocker.toString() === userId.toString() ? block.blocked : block.blocker;
    ids.add(other.toString());
  }
  return ids;
};

export const isBlockedBetween = async (a, b) => {
  const block = await Block.exists({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  });
  return !!block;
};

export const canViewUser = async (viewerId, ownerId) => {
  if (viewerId.toString() === ownerId.toString()) return true;

  if (await isBlockedBetween(viewerId, ownerId)) return false;

  const owner = await User.findById(ownerId).select('isPrivate').lean();
  if (!owner) return false;
  if (!owner.isPrivate) return true;

  const knock = await Knock.exists({
    $or: [
      { knocker: viewerId, knocked: ownerId, status: { $in: ['onesidedlock', 'lockedIn'] } },
      { knocker: ownerId, knocked: viewerId, status: 'lockedIn' },
    ],
  });
  return !!knock;
};

export const getViewableUserIds = async (viewerId, ownerIds) => {
  const unique = [...new Set(ownerIds.map(String))];
  const blocked = await getBlockedIds(viewerId);
  const owners = await User.find({ _id: { $in: unique } })
    .select('isPrivate')
    .lean();

  const privateIds = owners.filter((o) => o.isPrivate).map((o) => o._id);
  const allowedPrivate = new Set();

  if (privateIds.length) {
    const knocks = await Knock.find({
      $or: [
        { knocker: viewerId, knocked: { $in: privateIds }, status: { $in: ['onesidedlock', 'lockedIn'] } },
        { knocked: viewerId, knocker: { $in: privateIds }, status: 'lockedIn' },
      ],
    })
      .select('knocker knocked')
      .lean();

    for (const knock of knocks) {
      const other =
        knock.knocker.toString() === viewerId.toString() ? knock.knocked : knock.knocker;
      allowedPrivate.add(other.toString());
    }
  }

  const viewable = new Set();
  for (const owner of owners) {
    const id = owner._id.toString();
    if (blocked.has(id)) continue;
    if (id === viewerId.toString() || !owner.isPrivate || allowedPrivate.has(id)) {
      viewable.add(id);
    }
  }
  return viewable;
};

export const getAudienceIds = async (authorId) => {
  const author = await User.exists({ _id: authorId });
  if (!author) return [];

  const knocks = await Knock.find({
    $or: [
      { knocked: authorId, status: { $in: ['onesidedlock', 'lockedIn'] } },
      { knocker: authorId, status: 'lockedIn' },
    ],
  })
    .select('knocker knocked')
    .lean();

  const ids = new Set();
  for (const knock of knocks) {
    const other =
      knock.knocker.toString() === authorId.toString() ? knock.knocked : knock.knocker;
    ids.add(other.toString());
  }

  const blocked = await getBlockedIds(authorId);
  blocked.forEach((id) => ids.delete(id));
  ids.add(authorId.toString());
  return [...ids];
};

export const getLockedInIds = async (userId) => {
  const knocks = await Knock.find({ knocker: userId, status: 'lockedIn' })
    .select('knocked')
    .lean();
  const blocked = await getBlockedIds(userId);
  return knocks.map((k) => k.knocked.toString()).filter((id) => !blocked.has(id));
};

export const emitToUsers = (io, userIds, event, payload) => {
  if (!io) return;
  for (const id of userIds) {
    io.to(`notifications-${id}`).emit(event, payload);
  }
};

export const publicUserFields =
  'firstName lastName bio gender profileImage additionalImages isPrivate wordleStats createdAt';
