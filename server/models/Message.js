/**
 * SamChat — Modèle Message
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Message {
  static create({ conversationId, senderId, type = 'text', content = null, attachmentUrl = null, replyToId = null }) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, type, content, attachment_url, reply_to_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, conversationId, senderId, type, content, attachmentUrl, replyToId);

    return Message.findById(id);
  }

  static findById(id) {
    return db
      .prepare(`
        SELECT m.*, u.username AS sender_username, u.display_name AS sender_name, u.avatar_url AS sender_avatar
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.id = ?
      `)
      .get(id);
  }

  static listForConversation(conversationId, limit = 50, beforeTimestamp = null) {
    const query = beforeTimestamp
      ? `SELECT m.*, u.username AS sender_username, u.display_name AS sender_name, u.avatar_url AS sender_avatar
         FROM messages m JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ? AND m.created_at < ?
         ORDER BY m.created_at DESC LIMIT ?`
      : `SELECT m.*, u.username AS sender_username, u.display_name AS sender_name, u.avatar_url AS sender_avatar
         FROM messages m JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at DESC LIMIT ?`;

    const rows = beforeTimestamp
      ? db.prepare(query).all(conversationId, beforeTimestamp, limit)
      : db.prepare(query).all(conversationId, limit);

    return rows.reverse();
  }

  static edit(messageId, newContent) {
    const message = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId);
    if (!message) return null;

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO message_edits (id, message_id, previous_content) VALUES (?, ?, ?)
      `).run(uuidv4(), messageId, message.content);

      db.prepare(`
        UPDATE messages SET content = ?, is_edited = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(newContent, messageId);
    });
    tx();

    return Message.findById(messageId);
  }

  static getEditHistory(messageId) {
    return db
      .prepare(`SELECT * FROM message_edits WHERE message_id = ? ORDER BY edited_at ASC`)
      .all(messageId);
  }

  static softDelete(messageId) {
    db.prepare(`
      UPDATE messages SET is_deleted = 1, content = NULL, attachment_url = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(messageId);
    return Message.findById(messageId);
  }

  static setStatus(messageId, userId, status) {
    db.prepare(`
      INSERT INTO message_status (id, message_id, user_id, status)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(message_id, user_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
    `).run(uuidv4(), messageId, userId, status);
  }

  static addReaction(messageId, userId, emoji) {
    db.prepare(`
      INSERT OR REPLACE INTO message_reactions (id, message_id, user_id, emoji)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), messageId, userId, emoji);

    return db.prepare(`SELECT emoji, user_id FROM message_reactions WHERE message_id = ?`).all(messageId);
  }

  static removeReaction(messageId, userId, emoji) {
    db.prepare(`DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`).run(
      messageId,
      userId,
      emoji
    );
    return db.prepare(`SELECT emoji, user_id FROM message_reactions WHERE message_id = ?`).all(messageId);
  }
}

module.exports = Message;