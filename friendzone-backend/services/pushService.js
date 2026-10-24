import User from '../models/User.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

export const isValidPushToken = (token) => typeof token === 'string' && EXPO_TOKEN.test(token);

export const isUserOnline = (io, userId) =>
  (io?.sockets?.adapter?.rooms?.get(`notifications-${userId}`)?.size ?? 0) > 0;

const prune = async (tokens) => {
  if (!tokens.length) return;
  await User.updateMany({ 'pushTokens.token': { $in: tokens } }, { $pull: { pushTokens: { token: { $in: tokens } } } });
};

export const sendPush = async (userIds, { title, body, data = {}, channelId = 'default' }) => {
  try {
    const ids = [...new Set((userIds || []).map(String))];
    if (!ids.length) return;

    const users = await User.find({ _id: { $in: ids } }).select('+pushTokens').lean();
    const messages = [];
    for (const user of users) {
      for (const entry of user.pushTokens || []) {
        if (isValidPushToken(entry.token)) {
          messages.push({
            to: entry.token,
            title,
            body: String(body || '').slice(0, 180),
            data,
            sound: 'default',
            priority: 'high',
            channelId,
          });
        }
      }
    }

    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (!response.ok) continue;
      const json = await response.json().catch(() => null);
      const dead = [];
      (json?.data || []).forEach((ticket, index) => {
        if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
          dead.push(batch[index].to);
        }
      });
      await prune(dead);
    }
  } catch (error) {
    console.warn('Push send failed:', error.message);
  }
};

export const pushToOffline = (io, userIds, payload) => {
  const offline = (userIds || []).filter((id) => !isUserOnline(io, id));
  if (!offline.length) return Promise.resolve();
  return sendPush(offline, payload);
};
