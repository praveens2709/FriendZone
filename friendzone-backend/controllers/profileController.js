const User = require('../models/User');

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      firstName,
      lastName,
      gender,
      dob,
      bio,
      phone,
    } = req.body;

    const updateData = {
      firstName,
      lastName,
      gender,
      dob,
      bio,
      phone,
    };

    if (req.file && req.file.path) {
      updateData.profileImage = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password -otp -otpExpires');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpires');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.toggleUserPrivacy = async (req, res) => {
  const userId = req.user.id;
  const { isPrivate } = req.body;
  
  if (typeof isPrivate !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Invalid value for isPrivate. Must be true or false.' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isPrivate = isPrivate;
    await user.save();

    res.json({ success: true, message: `Account set to ${isPrivate ? 'private' : 'public'}.`, isPrivate: user.isPrivate });

  } catch (err) {
    console.error('[ProfileController] Error toggling user privacy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};