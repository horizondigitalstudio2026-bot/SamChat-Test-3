/**
 * SamChat — Contrôleur Conversations
 */

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

async function listConversations(req, res, next) {
  try {
    const conversations = Conversation.listForUser(req.user.id);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

async function openPrivateConversation(req, res, next) {
  try {
    const { userId } = req.body;
    const target = User.findById(userId);
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const conversation = Conversation.findOrCreatePrivate(req.user.id, userId);
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function createGroup(req, res, next) {
  try {
    const { name, memberIds } = req.body;
    if (!name || !Array.isArray(memberIds) || memberIds.length < 1) {
      return res.status(400).json({ error: 'Un groupe nécessite un nom et au moins un membre.' });
    }
    const conversation = Conversation.createGroup(name, req.user.id, memberIds);
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const { id } = req.params;
    const { before, limit } = req.query;

    if (!Conversation.isMember(id, req.user.id)) {
      return res.status(403).json({ error: "Vous n'êtes pas membre de cette conversation." });
    }

    const messages = Message.listForConversation(id, Number(limit) || 50, before || null);
    res.json({ messages, members: Conversation.membersOf(id) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listConversations, openPrivateConversation, createGroup, getMessages };