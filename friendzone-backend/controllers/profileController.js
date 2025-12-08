import User from '../models/User.js';
import { uploadImageToCloudinary } from "../services/cloudinaryService.js";

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      firstName,
      lastName,
      gender,
      bio,
    } = req.body;

    if (!firstName || firstName.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: "First name is required." 
      });
    }

    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName?.trim() || '',
      gender: gender?.toLowerCase() || '',
      bio: bio?.trim() || '',
    };

    if (req.file && req.file.buffer) {
      try {
        const uploadedImage = await uploadImageToCloudinary(req.file.buffer, "profiles");
        updateData.profileImage = uploadedImage.url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to upload profile image." 
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires');

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found." 
      });
    }

    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      user: updatedUser 
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error while updating profile" 
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpires');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching profile' 
    });
  }
};

export const getProfileById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required.' 
      });
    }

    const user = await User.findById(userId).select('-password -otp -otpExpires');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("Get profile by ID error:", err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching profile' 
    });
  }
};

export const toggleUserPrivacy = async (req, res) => {
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