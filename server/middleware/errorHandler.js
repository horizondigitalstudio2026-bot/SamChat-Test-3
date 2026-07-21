/**
 * SamChat — Gestionnaire d'erreurs centralisé
 */

const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404).json({ error: `Route introuvable : ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`);

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Jeton CSRF invalide.' });
  }

  res.status(status).json({
    error: status === 500 ? 'Erreur interne du serveur.' : err.message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };