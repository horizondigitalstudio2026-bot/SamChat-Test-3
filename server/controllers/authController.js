/**
 * SamChat — Contrôleur Authentification
 */

const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const db = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokens');
const logger = require('../utils/logger');

function logLogin(userId, req, success) {
  db.prepare(`
    INSERT INTO login_logs (id, user_id, ip_address, user_agent, success)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, req.ip, req.headers['user-agent'] || '', success ? 1 : 0);
}

async function register(req, res, next) {
  try {
    const { username, email, password, displayName } = req.body;

    if (User.findByEmail(email)) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }
    if (User.findByUsername(username)) {
      return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris." });
    }

    const user = User.create({ username, email, password, displayName: displayName || username });
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logLogin(user.id, req, true);
    logger.info(`Nouvel utilisateur inscrit : ${user.username}`);

    res
      .cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 30 * 24 * 3600 * 1000 })
      .status(201)
      .json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const userRow = User.findByEmailOrUsername(identifier);

    if (!userRow || !User.verifyPassword(password, userRow.password_hash)) {
      if (userRow) logLogin(userRow.id, req, false);
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const user = User.findById(userRow.id);
    User.updateStatus(user.id, 'online');

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logLogin(user.id, req, true);

    res
      .cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 30 * 24 * 3600 * 1000 })
      .json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Jeton de rafraîchissement manquant.' });

    const payload = verifyRefreshToken(token);
    const user = User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable.' });

    const accessToken = generateAccessToken(user);
    res.json({ user, accessToken });
  } catch (err) {
    res.status(401).json({ error: 'Jeton de rafraîchissement invalide ou expiré.' });
  }
}

async function logout(req, res) {
  if (req.user) User.updateStatus(req.user.id, 'offline');
  res.clearCookie('refreshToken').json({ message: 'Déconnecté.' });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, refresh, logout, me };