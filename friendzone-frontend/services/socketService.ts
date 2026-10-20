import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/constants/const';
import { getAuthSession } from '@/utils/auth-storage';

let socket: Socket | null = null;

export const connectSocket = (userId: string) => {
  if (socket && socket.connected) {
    return socket;
  }

  const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  socket = io(socketUrl, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    auth: async (callback) => {
      const stored = await getAuthSession();
      const token = stored ? JSON.parse(stored).accessToken : null;
      callback({ token });
    },
  });

  socket.on('connect', () => {
    socket?.emit('setUserId', userId);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
