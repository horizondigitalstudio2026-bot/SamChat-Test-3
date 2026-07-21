/**
 * SamChat — Génération de jetons JWT (accès + rafraîchissement)
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

function generateRefreshToken(user) {
  return jwt.sign({ sub: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

module.exports = { generateAccessToken, generateRefreshToken, verifyRefreshToken };