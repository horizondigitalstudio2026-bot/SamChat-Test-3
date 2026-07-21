/**
 * SamChat — Modèle Contact
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Contact {
  static add(ownerId, contactId, nickname = null) {
    const id = uuidv4();
    db.prepare(`
      INSERT OR IGNORE INTO contacts (id, owner_id, contact_id, nickname)
      VALUES (?, ?, ?, ?)
    `).run(id, ownerId, contactId, nickname);

    return Contact.list(ownerId);
  }

  static remove(ownerId, contactId) {
    db.prepare(`DELETE FROM contacts WHERE owner_id = ? AND contact_id = ?`).run(
      ownerId,
      contactId
    );
  }

  static list(ownerId) {
    return db
      .prepare(`
        SELECT c.id AS contact_link_id, c.nickname, u.id, u.username, u.display_name,
               u.avatar_url, u.status, u.last_seen_at
        FROM contacts c
        JOIN users u ON u.id = c.contact_id
        WHERE c.owner_id = ?
        ORDER BY u.display_name COLLATE NOCASE ASC
      `)
      .all(ownerId);
  }

  static exists(ownerId, contactId) {
    return !!db
      .prepare(`SELECT 1 FROM contacts WHERE owner_id = ? AND contact_id = ?`)
      .get(ownerId, contactId);
  }
}

module.exports = Contact;