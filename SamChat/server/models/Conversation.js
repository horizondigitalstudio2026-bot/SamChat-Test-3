/**
 * SamChat — Modèle Conversation (privée ou groupe)
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Conversation {
  /**
   * Trouve une conversation privée existante entre deux utilisateurs,
   * ou la crée si elle n'existe pas encore.
   */
  static findOrCreatePrivate(userIdA, userIdB) {
    const existing = db
      .prepare(`
        SELECT cm1.conversation_id AS id
        FROM conversation_members cm1
        JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
        JOIN conversations c ON c.id = cm1.conversation_id
        WHERE c.type = 'private' AND cm1.user_id = ? AND cm2.user_id = ?
      `)
      .get(userIdA, userIdB);

    if (existing) return Conversation.findById(existing.id);

    const id = uuidv4();
    const insertConv = db.prepare(`
      INSERT INTO conversations (id, type, created_by) VALUES (?, 'private', ?)
    `);
    const insertMember = db.prepare(`
      INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, ?)
    `);

    const tx = db.transaction(() => {
      insertConv.run(id, userIdA);
      insertMember.run(uuidv4(), id, userIdA);
      insertMember.run(uuidv4(), id, userIdB);
    });
    tx();

    return Conversation.findById(id);
  }

  static createGroup(name, createdBy, memberIds = []) {
    const id = uuidv4();
    const insertConv = db.prepare(`
      INSERT INTO conversations (id, type, name, created_by) VALUES (?, 'group', ?, ?)
    `);
    const insertMember = db.prepare(`
      INSERT INTO conversation_members (id, conversation_id, user_id, role) VALUES (?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      insertConv.run(id, name, createdBy);
      insertMember.run(uuidv4(), id, createdBy, 'admin');
      memberIds
        .filter((m) => m !== createdBy)
        .forEach((memberId) => insertMember.run(uuidv4(), id, memberId, 'member'));
    });
    tx();

    return Conversation.findById(id);
  }

  static findById(id) {
    return db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
  }

  static isMember(conversationId, userId) {
    return !!db
      .prepare(`SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?`)
      .get(conversationId, userId);
  }

  static membersOf(conversationId) {
    return db
      .prepare(`
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.status, cm.role
        FROM conversation_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.conversation_id = ?
      `)
      .all(conversationId);
  }

  /**
   * Liste toutes les conversations d'un utilisateur, avec le dernier message
   * et le nom d'affichage adapté (nom du contact pour le privé, nom du groupe sinon).
   */
  static listForUser(userId) {
    const conversations = db
      .prepare(`
        SELECT c.id, c.type, c.name, c.avatar_url, cm.pinned, cm.archived
        FROM conversations c
        JOIN conversation_members cm ON cm.conversation_id = c.id
        WHERE cm.user_id = ?
      `)
      .all(userId);

    const lastMessageStmt = db.prepare(`
      SELECT content, type, sender_id, created_at, is_deleted
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const otherMemberStmt = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.status, u.last_seen_at
      FROM conversation_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.conversation_id = ? AND cm.user_id != ?
      LIMIT 1
    `);

    return conversations.map((conv) => {
      const lastMessage = lastMessageStmt.get(conv.id);
      let displayName = conv.name;
      let displayAvatar = conv.avatar_url;
      let peer = null;

      if (conv.type === 'private') {
        peer = otherMemberStmt.get(conv.id, userId);
        displayName = peer ? peer.display_name : 'Utilisateur supprimé';
        displayAvatar = peer ? peer.avatar_url : null;
      }

      return {
        ...conv,
        displayName,
        displayAvatar,
        peer,
        lastMessage: lastMessage || null,
      };
    });
  }
}

module.exports = Conversation;