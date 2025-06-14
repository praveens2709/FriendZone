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

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};
