/**
 * SamChat — Middleware d'authentification JWT
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const user = User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
}

/**
 * Version "douce" : n'échoue pas si le token est absent, mais l'attache s'il est valide.
 * Utile pour Socket.IO handshake.
 */
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    return User.findById(payload.sub);
  } catch (err) {
    return null;
  }
}

module.exports = { authenticate, verifyToken };