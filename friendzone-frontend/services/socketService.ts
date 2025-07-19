// services/socketService.ts
 
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/constants/const';

let socket: Socket | null = null;

export const connectSocket = (userId: string) => {
  if (socket && socket.connected) {
    console.log('Socket already connected.');
    socket.emit('setUserId', userId);
    return socket;
  }

  const socketUrl = API_BASE_URL.replace('/api', '');
  socket = io(socketUrl, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    socket?.emit('setUserId', userId);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Socket reconnect attempt: ${attemptNumber}`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('Socket reconnect error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('Socket reconnect failed permanently.');
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected and cleared.');
  }
};
