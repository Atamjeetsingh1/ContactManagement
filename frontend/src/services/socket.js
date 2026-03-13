import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socket && socket.connected) return socket;

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const serverUrl = apiUrl.replace(/\/api$/, '');

  socket = io(serverUrl, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('🔌 Socket connected'));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinRoom = (roomId) => {
  if (socket) {
    socket.emit('join_room', roomId);
  }
};

export const leaveRoom = (roomId) => {
  if (socket) {
    socket.emit('leave_room', roomId);
  }
};

export const sendMessage = (roomId, message, type = 'text', attachments = null, contactCard = null) => {
  if (socket) {
    const messageData = { roomId, message, type, attachments, contactCard };
    console.log('🔌 Sending message via socket:', messageData);
    socket.emit('send_message', messageData);
  } else {
    console.error('❌ Socket not connected - cannot send message');
  }
};

export const sendTyping = (roomId) => {
  if (socket) {
    socket.emit('typing', { roomId });
  }
};

export const stopTyping = (roomId) => {
  if (socket) {
    socket.emit('stop_typing', { roomId });
  }
};

export const addReaction = (messageId, emoji) => {
  if (socket) {
    socket.emit('add_reaction', { messageId, emoji });
  }
};

export const removeReaction = (messageId) => {
  if (socket) {
    socket.emit('remove_reaction', { messageId });
  }
};

export const editMessage = (messageId, newMessage) => {
  if (socket) {
    socket.emit('edit_message', { messageId, newMessage });
  }
};

export const deleteMessage = (messageId) => {
  if (socket) {
    socket.emit('delete_message', { messageId });
  }
};

export const pinMessage = (messageId) => {
  if (socket) {
    socket.emit('pin_message', { messageId });
  }
};

export const markRead = (roomId, messageId) => {
  if (socket) {
    socket.emit('mark_read', { roomId, messageId });
  }
};

export const searchMessages = (roomId, query) => {
  if (socket) {
    socket.emit('search_messages', { roomId, query });
  }
};

export const getPinnedMessages = (roomId) => {
  if (socket) {
    socket.emit('get_pinned', { roomId });
  }
};
