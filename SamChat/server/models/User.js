/**
 * SamChat — Modèle Utilisateur
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const PUBLIC_FIELDS = `id, username, email, display_name, avatar_url, bio, status, last_seen_at, theme, created_at`;

class User {
  static create({ username, email, password, displayName }) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);

    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, display_name)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, username, email, passwordHash, displayName);

    return User.findById(id);
  }

  static findById(id) {
    return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(id);
  }

  static findByEmail(email) {
    return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  }

  static findByUsername(username) {
    return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
  }

  static findByEmailOrUsername(identifier) {
    return db
      .prepare(`SELECT * FROM users WHERE email = ? OR username = ?`)
      .get(identifier, identifier);
  }

  static verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compareSync(plainPassword, passwordHash);
  }

  static updateStatus(id, status) {
    db.prepare(`UPDATE users SET status = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
      status,
      id
    );
  }

  static updateProfile(id, { displayName, bio, avatarUrl, theme }) {
    db.prepare(`
      UPDATE users
      SET display_name = COALESCE(?, display_name),
          bio = COALESCE(?, bio),
          avatar_url = COALESCE(?, avatar_url),
          theme = COALESCE(?, theme),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(displayName, bio, avatarUrl, theme, id);

    return User.findById(id);
  }

  static search(query, excludeUserId) {
    const like = `%${query}%`;
    return db
      .prepare(`
        SELECT ${PUBLIC_FIELDS} FROM users
        WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
        LIMIT 20
      `)
      .all(like, like, excludeUserId);
  }
}

module.exports = User;