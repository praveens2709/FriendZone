import Vibe, { VIBE_KINDS } from '../models/Vibe.js';
import { cleanString } from '../utils/validate.js';
import { emitToUsers, getLockedInIds } from '../services/privacyService.js';

const OWNER_FIELDS = 'firstName lastName profileImage';

const serialize = (vibe) => ({
  id: vibe._id.toString(),
  kind: vibe.kind,
  note: vibe.note,
  expiresAt: vibe.expiresAt,
  updatedAt: vibe.updatedAt,
  user: vibe.user && vibe.user._id
    ? {
        id: vibe.user._id.toString(),
        firstName: vibe.user.firstName,
        lastName: vibe.user.lastName,
        profileImage: vibe.user.profileImage || null,
      }
    : undefined,
});

export const getCircleVibes = async (req, res) => {
  try {
    const circleIds = await getLockedInIds(req.user.id);

    const [mine, circle] = await Promise.all([
      Vibe.findOne({ user: req.user.id, expiresAt: { $gt: new Date() } }).populate('user', OWNER_FIELDS),
      Vibe.find({ user: { $in: circleIds }, expiresAt: { $gt: new Date() } })
        .sort({ updatedAt: -1 })
        .populate('user', OWNER_FIELDS),
    ]);

    res.json({
      mine: mine ? serialize(mine) : null,
      circle: circle.filter((v) => v.user).map(serialize),
    });
  } catch (error) {
    console.error('Error fetching vibes:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const setVibe = async (req, res) => {
  const { kind } = req.body || {};
  const note = cleanString(req.body?.note, 80);
  const hours = Math.min(Math.max(Number(req.body?.hours) || 24, 1), 24);

  if (!VIBE_KINDS.includes(kind)) {
    return res.status(400).json({ message: 'Invalid vibe.' });
  }

  try {
    const vibe = await Vibe.findOneAndUpdate(
      { user: req.user.id },
      { kind, note, expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('user', OWNER_FIELDS);

    const circleIds = await getLockedInIds(req.user.id);
    emitToUsers(req.app.get('socketio'), circleIds, 'vibeChanged', { userId: req.user.id });

    res.json(serialize(vibe));
  } catch (error) {
    console.error('Error setting vibe:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const clearVibe = async (req, res) => {
  try {
    await Vibe.deleteOne({ user: req.user.id });

    const circleIds = await getLockedInIds(req.user.id);
    emitToUsers(req.app.get('socketio'), circleIds, 'vibeChanged', { userId: req.user.id });

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing vibe:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};
