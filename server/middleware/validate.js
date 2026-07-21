/**
 * SamChat — Validation des entrées et protection XSS
 */

const { validationResult } = require('express-validator');
const xss = require('xss');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Données invalides.', details: errors.array() });
  }
  next();
}

/**
 * Nettoie récursivement les chaînes de caractères du corps de la requête
 * pour empêcher l'injection de scripts (XSS).
 */
function sanitizeBody(req, res, next) {
  const clean = (value) => {
    if (typeof value === 'string') return xss(value.trim());
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
    }
    return value;
  };

  if (req.body) req.body = clean(req.body);
  next();
}

module.exports = { handleValidation, sanitizeBody };