import Feedback from '../models/Feedback.js';
import { cleanString } from '../utils/validate.js';

const TYPES = Feedback.schema.path('type').enumValues;

export const sendFeedback = async (req, res) => {
  const type = TYPES.includes(req.body?.type) ? req.body.type : 'help';
  const message = cleanString(req.body?.message, 2000);
  const appVersion = cleanString(req.body?.appVersion, 40);

  if (message.length < 5) {
    return res.status(400).json({ message: 'Please tell us a little more.' });
  }

  try {
    await Feedback.create({ user: req.user.id, type, message, appVersion });
    res.status(201).json({ success: true, message: 'Thanks, we got your message.' });
  } catch (error) {
    console.error('Error saving feedback:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};
