import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import { isValidPushToken } from '../services/pushService.js';

const router = Router();

router.use(protect);

router.post('/register', async (req, res) => {
  const { token, platform } = req.body || {};
  if (!isValidPushToken(token)) {
    return res.status(400).json({ message: 'Invalid push token.' });
  }
  try {
    await User.updateMany({ 'pushTokens.token': token, _id: { $ne: req.user.id } }, { $pull: { pushTokens: { token } } });
    await User.updateOne({ _id: req.user.id }, { $pull: { pushTokens: { token } } });
    await User.updateOne(
      { _id: req.user.id },
      { $push: { pushTokens: { $each: [{ token, platform: platform === 'ios' ? 'ios' : 'android', updatedAt: new Date() }], $slice: -5 } } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error registering push token:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/unregister', async (req, res) => {
  const { token } = req.body || {};
  if (typeof token !== 'string') return res.status(400).json({ message: 'Invalid push token.' });
  try {
    await User.updateOne({ _id: req.user.id }, { $pull: { pushTokens: { token } } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing push token:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
