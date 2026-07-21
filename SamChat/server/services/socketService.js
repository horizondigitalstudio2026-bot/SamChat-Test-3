/**
 * SamChat — Service Temps Réel (Socket.IO)
 * ------------------------------------------------------------
 * Gère : présence en ligne, indicateur "en train d'écrire",
 * envoi/édition/suppression de messages, accusés de réception,
 * réactions. Conçu pour être étendu (appels WebRTC, stories...)
 * dans les phases suivantes.
 */

const { verifyToken } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');

// userId -> Set de socket.id (un utilisateur peut avoir plusieurs appareils/onglets)
const onlineUsers = new Map();

function registerSocketHandlers(io) {
  // Authentification au moment du handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = token ? verifyToken(token) : null;

    if (!user) return next(new Error('Authentification requise.'));

    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // --- Présence ---
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    if (socket.user.status !== 'invisible') {
      User.updateStatus(userId, 'online');
      socket.broadcast.emit('presence:update', { userId, status: 'online' });
    }

    // L'utilisateur rejoint une "room" par conversation pour ne recevoir
    // que les événements qui le concernent.
    const conversations = Conversation.listForUser(userId);
    conversations.forEach((c) => socket.join(`conversation:${c.id}`));

    logger.info(`Socket connecté : ${socket.user.username} (${socket.id})`);

    // --- Rejoindre une conversation nouvellement créée ---
    socket.on('conversation:join', (conversationId) => {
      if (Conversation.isMember(conversationId, userId)) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // --- Indicateur "en train d'écrire" ---
    socket.on('typing:start', ({ conversationId }) => {
      if (!Conversation.isMember(conversationId, userId)) return;
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId,
        displayName: socket.user.display_name,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      if (!Conversation.isMember(conversationId, userId)) return;
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { conversationId, userId });
    });

    // --- Envoi de message ---
    socket.on('message:send', (payload, callback) => {
      try {
        const { conversationId, type, content, attachmentUrl, replyToId } = payload;

        if (!Conversation.isMember(conversationId, userId)) {
          return callback?.({ error: "Vous n'êtes pas membre de cette conversation." });
        }
        if (!content && !attachmentUrl) {
          return callback?.({ error: 'Le message est vide.' });
        }

        const message = Message.create({
          conversationId,
          senderId: userId,
          type: type || 'text',
          content: content || null,
          attachmentUrl: attachmentUrl || null,
          replyToId: replyToId || null,
        });

        Message.setStatus(message.id, userId, 'sent');

        io.to(`conversation:${conversationId}`).emit('message:new', message);
        callback?.({ message });
      } catch (err) {
        logger.error(`message:send — ${err.message}`);
        callback?.({ error: "Erreur lors de l'envoi du message." });
      }
    });

    // --- Édition de message ---
    socket.on('message:edit', ({ messageId, content }, callback) => {
      const message = Message.findById(messageId);
      if (!message) return callback?.({ error: 'Message introuvable.' });
      if (message.sender_id !== userId) {
        return callback?.({ error: 'Vous ne pouvez modifier que vos propres messages.' });
      }

      const updated = Message.edit(messageId, content);
      io.to(`conversation:${message.conversation_id}`).emit('message:edited', updated);
      callback?.({ message: updated });
    });

    // --- Suppression de message ---
    socket.on('message:delete', ({ messageId }, callback) => {
      const message = Message.findById(messageId);
      if (!message) return callback?.({ error: 'Message introuvable.' });
      if (message.sender_id !== userId) {
        return callback?.({ error: 'Vous ne pouvez supprimer que vos propres messages.' });
      }

      const deleted = Message.softDelete(messageId);
      io.to(`conversation:${message.conversation_id}`).emit('message:deleted', deleted);
      callback?.({ message: deleted });
    });

    // --- Accusés de réception ---
    socket.on('message:delivered', ({ messageId }) => {
      const message = Message.findById(messageId);
      if (!message) return;
      Message.setStatus(messageId, userId, 'delivered');
      io.to(`conversation:${message.conversation_id}`).emit('message:status', {
        messageId,
        userId,
        status: 'delivered',
      });
    });

    socket.on('message:read', ({ messageId }) => {
      const message = Message.findById(messageId);
      if (!message) return;
      Message.setStatus(messageId, userId, 'read');
      io.to(`conversation:${message.conversation_id}`).emit('message:status', {
        messageId,
        userId,
        status: 'read',
      });
    });

    // --- Réactions ---
    socket.on('message:react', ({ messageId, emoji }) => {
      const message = Message.findById(messageId);
      if (!message) return;
      const reactions = Message.addReaction(messageId, userId, emoji);
      io.to(`conversation:${message.conversation_id}`).emit('message:reactions', {
        messageId,
        reactions,
      });
    });

    socket.on('message:unreact', ({ messageId, emoji }) => {
      const message = Message.findById(messageId);
      if (!message) return;
      const reactions = Message.removeReaction(messageId, userId, emoji);
      io.to(`conversation:${message.conversation_id}`).emit('message:reactions', {
        messageId,
        reactions,
      });
    });

    // --- Déconnexion ---
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          User.updateStatus(userId, 'offline');
          socket.broadcast.emit('presence:update', { userId, status: 'offline' });
        }
      }
      logger.info(`Socket déconnecté : ${socket.user.username} (${socket.id})`);
    });
  });
}

module.exports = { registerSocketHandlers, onlineUsers };