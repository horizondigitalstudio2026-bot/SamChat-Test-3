/**
 * SamChat — Client Socket.IO
 * Encapsule la connexion temps réel et expose un système d'événements
 * simple pour le reste de l'application (pattern observateur léger).
 */

const RealTime = (() => {
  let socket = null;
  const listeners = {};

  function on(event, handler) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(handler);
  }

  function emitLocal(event, payload) {
    (listeners[event] || []).forEach((fn) => fn(payload));
  }

  function connect(accessToken) {
    socket = io({ auth: { token: accessToken } });

    const forwardedEvents = [
      'presence:update',
      'typing:start',
      'typing:stop',
      'message:new',
      'message:edited',
      'message:deleted',
      'message:status',
      'message:reactions',
    ];

    forwardedEvents.forEach((eventName) => {
      socket.on(eventName, (payload) => emitLocal(eventName, payload));
    });

    socket.on('connect_error', (err) => {
      emitLocal('connect_error', err);
    });

    return socket;
  }

  function joinConversation(conversationId) {
    socket?.emit('conversation:join', conversationId);
  }

  function startTyping(conversationId) {
    socket?.emit('typing:start', { conversationId });
  }

  function stopTyping(conversationId) {
    socket?.emit('typing:stop', { conversationId });
  }

  function sendMessage(payload) {
    return new Promise((resolve, reject) => {
      socket.emit('message:send', payload, (res) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res.message);
      });
    });
  }

  function editMessage(messageId, content) {
    return new Promise((resolve, reject) => {
      socket.emit('message:edit', { messageId, content }, (res) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res.message);
      });
    });
  }

  function deleteMessage(messageId) {
    return new Promise((resolve, reject) => {
      socket.emit('message:delete', { messageId }, (res) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res.message);
      });
    });
  }

  function markDelivered(messageId) {
    socket?.emit('message:delivered', { messageId });
  }

  function markRead(messageId) {
    socket?.emit('message:read', { messageId });
  }

  function react(messageId, emoji) {
    socket?.emit('message:react', { messageId, emoji });
  }

  function unreact(messageId, emoji) {
    socket?.emit('message:unreact', { messageId, emoji });
  }

  return {
    on,
    connect,
    joinConversation,
    startTyping,
    stopTyping,
    sendMessage,
    editMessage,
    deleteMessage,
    markDelivered,
    markRead,
    react,
    unreact,
  };
})();