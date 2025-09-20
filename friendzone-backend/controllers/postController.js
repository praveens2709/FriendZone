import Post from '../models/Post.js';
import User from '../models/User.js';
import Knock from '../models/Knock.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { uploadImageToCloudinary } from '../services/cloudinaryService.js';
import multer from 'multer';
import sharp from 'sharp';

const upload = multer({ storage: multer.memoryStorage() });

const addBlackBackground = async (buffer, size = 1080) => {
  return await sharp(buffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .jpeg()
    .toBuffer();
};

export const createPost = [
  upload.array('images', 10),
  async (req, res) => {
    try {
      const { caption, location, song } = req.body;
      const userId = req.user.id;
      const io = req.app.get('socketio');

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No images provided.' });
      }

      const uploadedImages = await Promise.all(
        req.files.map(async (file) => {
          const processedBuffer = await addBlackBackground(file.buffer);
          return uploadImageToCloudinary(processedBuffer, 'post_images');
        })
      );

      let songData = null;
      if (song) {
        try {
          songData = JSON.parse(song);
        } catch {
          return res.status(400).json({ message: 'Invalid song data format.' });
        }
      }

      const newPost = new Post({
        user: userId,
        images: uploadedImages,
        caption: caption || '',
        location: location || '',
        song: songData,
      });

      await newPost.save();
      await newPost.populate('user', 'firstName lastName profileImage');

      io.emit('newPost', newPost);

      res.status(201).json({ message: 'Post created successfully', post: newPost });
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: 'Server error during post creation.' });
    }
  }
];

export const getMyPosts = async (req, res) => {
  const userId = req.user.id;
  try {
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName profileImage')
      .populate('comments.user', 'firstName lastName profileImage');

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching user's posts:", error);
    res.status(500).json({ message: 'Server error fetching posts.' });
  }
};

export const getFeedPosts = async (req, res) => {
  const userId = req.user.id;
  try {
    const knockingKnocks = await Knock.find({
      knocker: userId,
      status: 'onesidedlock',
    }).select('knocked');

    const lockedInKnocks = await Knock.find({
      $or: [
        { knocker: userId, status: 'lockedIn' },
        { knocked: userId, status: 'lockedIn' },
      ]
    }).select('knocker knocked');

    const knockingIds = knockingKnocks.map(knock => knock.knocked);
    const lockedInIds = lockedInKnocks.map(knock => {
      return knock.knocker.toString() === userId.toString() ? knock.knocked : knock.knocker;
    });

    const relevantUserIds = [...new Set([...knockingIds, ...lockedInIds])];

    const posts = await Post.find({ user: { $in: relevantUserIds } })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName profileImage')
      .populate('comments.user', 'firstName lastName profileImage');

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching filtered posts:", error);
    res.status(500).json({ message: 'Server error fetching posts.' });
  }
};

export const getPostsByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName profileImage')
      .populate('comments.user', 'firstName lastName profileImage');

    res.status(200).json(posts);
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    res.status(500).json({ message: 'Server error fetching user posts.' });
  }
};

export const getPostById = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId)
      .populate('user', 'firstName lastName profileImage')
      .populate('comments.user', 'firstName lastName profileImage');
      
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error(`Error fetching post ${postId}:`, error);
    res.status(500).json({ message: 'Server error fetching post.' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    const io = req.app.get('socketio');

    if (!text) return res.status(400).json({ message: 'Comment text is required.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const newComment = { user: userId, text };
    post.comments.push(newComment);
    await post.save();

    const addedComment = post.comments[post.comments.length - 1];
    const user = await User.findById(userId).select('firstName lastName profileImage');

    const populatedComment = {
      ...addedComment.toObject(),
      user: user.toObject(),
    };

    io.emit('newComment', { postId, comment: populatedComment });

    res.status(201).json({ message: 'Comment added successfully', comment: populatedComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: 'Server error during comment creation.' });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const hasLiked = post.likes.includes(userId);
    if (hasLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json({ success: true, liked: !hasLiked, likesCount: post.likes.length });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const toggleSave = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const hasSaved = post.saves.includes(userId);
    if (hasSaved) {
      post.saves.pull(userId);
    } else {
      post.saves.push(userId);
    }

    await post.save();
    res.json({ success: true, saved: !hasSaved, savesCount: post.saves.length });
  } catch (error) {
    console.error("Error toggling save:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const sharePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    post.shares += 1;
    await post.save();

    res.json({ success: true, shares: post.shares });
  } catch (error) {
    console.error("Error sharing post:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const sharePostToChat = async (req, res) => {
  const { postId } = req.params;
  const { chatId } = req.body;
  const senderId = req.user.id;

  try {
    const io = req.app.get('socketio');

    const post = await Post.findById(postId).populate('user', 'firstName profileImage');
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const newMessage = new Message({
      chat: chat._id,
      sender: senderId,
      content: {
        type: 'post',
        post: {
          id: post._id,
          user: post.user,
          images: post.images,
          caption: post.caption,
          createdAt: post.createdAt,
        }
      },
      text: `Shared a post from ${post.user.firstName}`,
    });

    await newMessage.save();

    chat.lastMessage = newMessage._id;
    chat.lastMessageAt = newMessage.timestamp;
    await chat.save();
    
    if (io) {
      io.to(chatId).emit('newChatMessage', { chatId, message: newMessage });
    }

    res.status(200).json({ success: true, message: 'Post shared to chat successfully.' });

  } catch (error) {
    console.error("Error sharing post to chat:", error);
    res.status(500).json({ message: 'Server error.' });
  }
};