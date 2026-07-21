/**
 * SamChat — Configuration centralisée
 * Charge et valide les variables d'environnement.
 */

require('dotenv').config();

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Variables d'environnement manquantes en production : ${missing.join(', ')}`);
}

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4000',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_only_insecure_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_only_insecure_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
  },

  upload: {
    maxSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 25,
  },
};