import User from '../models/User.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';
import { canViewUser, isBlockedBetween, publicUserFields, getAudienceIds, emitToUsers } from '../services/privacyService.js';
import { calculateAge, cleanString, isObjectId, toIdList } from '../utils/validate.js';
import Knock from '../models/Knock.js';
import { getActiveVibes, getCircleSet } from '../services/identityService.js';
import { getLockedInIds } from '../services/privacyService.js';
import { TERMS_VERSION } from '../utils/legal.js';

const OWN_PROFILE_EXCLUDE =
  '-password -otp -otpPurpose -otpExpires -otpAttempts -otpLockedUntil -lastOtpSentAt -tokenVersion -profileImagePublicId -pendingEmail';
const MIN_AGE = 18;
const MAX_AGE = 100;
const ALLOWED_GENDERS = ['male', 'female', 'other', ''];

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const firstName = cleanString(req.body.firstName, 50);
    if (!firstName) {
      return res.status(400).json({
        success: false,
        message: 'First name is required.',
      });
    }

    const gender = cleanString(req.body.gender, 20).toLowerCase();
    if (!ALLOWED_GENDERS.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender value.',
      });
    }

    const updateData = {
      firstName,
      lastName: cleanString(req.body.lastName, 50),
      gender,
      bio: cleanString(req.body.bio, 300),
    };

    if (req.body.dob) {
      const dob = new Date(req.body.dob);
      if (Number.isNaN(dob.getTime()) || dob > new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid date of birth.' });
      }
      const age = calculateAge(dob);
      if (age < MIN_AGE) {
        return res.status(400).json({
          success: false,
          message: `You must be at least ${MIN_AGE} years old to use FriendZone.`,
        });
      }
      if (age > MAX_AGE) {
        return res.status(400).json({ success: false, message: 'Invalid date of birth.' });
      }
      updateData.dob = dob;
    }

    let previousPublicId = null;
    if (req.file && req.file.buffer) {
      try {
        const uploadedImage = await uploadImageToCloudinary(req.file.buffer, 'profiles');
        updateData.profileImage = uploadedImage.url;
        updateData.profileImagePublicId = uploadedImage.public_id;
        previousPublicId = req.user.profileImagePublicId || null;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload profile image.',
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select(OWN_PROFILE_EXCLUDE);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (previousPublicId) {
      deleteImageFromCloudinary(previousPublicId);
    }

    const audience = await getAudienceIds(userId);
    emitToUsers(req.app.get('socketio'), audience, 'userProfileUpdated', {
      userId: userId.toString(),
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName || '',
      profileImage: updatedUser.profileImage || null,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(OWN_PROFILE_EXCLUDE);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: { ...user.toObject(), termsAccepted: user.termsVersion === TERMS_VERSION },
    });
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
    });
  }
};

export const getProfileById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    if (userId === req.user.id) {
      const self = await User.findById(userId).select(OWN_PROFILE_EXCLUDE);
      return res.json({ success: true, user: self });
    }

    if (await isBlockedBetween(req.user.id, userId)) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = await User.findOne({ _id: userId, isVerified: true })
      .select(publicUserFields)
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.isPrivate && !(await canViewUser(req.user.id, userId))) {
      return res.json({
        success: true,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage,
          isPrivate: true,
          createdAt: user.createdAt,
        },
      });
    }

    const [theirFriends, myCircle] = await Promise.all([
      Knock.find({ knocker: userId, status: 'lockedIn' }).select('knocked').lean(),
      getCircleSet(req.user.id),
    ]);
    const theirIds = theirFriends.map((k) => k.knocked.toString());
    const mutualIds = theirIds.filter((id) => myCircle.has(id));
    const isLockedIn = myCircle.has(userId);
    const [mutualUsers, vibes] = await Promise.all([
      User.find({ _id: { $in: mutualIds.slice(0, 3) } }).select('firstName').lean(),
      isLockedIn ? getActiveVibes([userId]) : Promise.resolve(new Map()),
    ]);

    res.json({
      success: true,
      user,
      relationship: {
        isLockedIn,
        lockedInCount: theirIds.length,
        mutualCount: mutualIds.length,
        mutualNames: mutualUsers.map((u) => u.firstName),
        vibe: vibes.get(userId) || null,
      },
    });
  } catch (err) {
    console.error('Get profile by ID error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
    });
  }
};

export const toggleUserPrivacy = async (req, res) => {
  const { isPrivate } = req.body || {};

  if (typeof isPrivate !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Invalid value for isPrivate. Must be true or false.' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { isPrivate } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: `Account set to ${isPrivate ? 'private' : 'public'}.`, isPrivate: user.isPrivate });
  } catch (err) {
    console.error('[ProfileController] Error toggling user privacy:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updatePhone = async (req, res) => {
  const raw = req.body?.phone;

  try {
    if (raw === null || raw === '') {
      await User.updateOne({ _id: req.user.id }, { $unset: { phone: 1 } });
      return res.json({ success: true, phone: null });
    }

    const phone = typeof raw === 'string' ? raw.replace(/[\s().-]/g, '') : '';
    if (!/^\+?[0-9]{7,15}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid phone number, including country code.' });
    }

    const taken = await User.exists({ phone, _id: { $ne: req.user.id } });
    if (taken) {
      return res.status(409).json({ success: false, message: 'That number is already used by another account.' });
    }

    await User.updateOne({ _id: req.user.id }, { $set: { phone } });
    res.json({ success: true, phone });
  } catch (err) {
    console.error('Update phone error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCloseFriends = async (req, res) => {
  try {
    const [friendIds, me] = await Promise.all([
      getLockedInIds(req.user.id),
      User.findById(req.user.id).select('closeFriends').lean(),
    ]);
    const closeSet = new Set((me?.closeFriends || []).map(String));
    const friends = await User.find({ _id: { $in: friendIds }, isVerified: true })
      .select('firstName lastName profileImage')
      .sort({ firstName: 1 })
      .lean();

    res.json({
      success: true,
      friends: friends.map((f) => ({
        id: f._id.toString(),
        firstName: f.firstName,
        lastName: f.lastName,
        profileImage: f.profileImage || null,
        isClose: closeSet.has(f._id.toString()),
      })),
    });
  } catch (err) {
    console.error('Get close friends error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateCloseFriends = async (req, res) => {
  const ids = toIdList(req.body?.userIds, 500);
  if (!ids) {
    return res.status(400).json({ success: false, message: 'Invalid list.' });
  }

  try {
    const friendIds = new Set(await getLockedInIds(req.user.id));
    const allowed = ids.filter((id) => friendIds.has(id));
    await User.updateOne({ _id: req.user.id }, { $set: { closeFriends: allowed } });
    res.json({ success: true, count: allowed.length });
  } catch (err) {
    console.error('Update close friends error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
