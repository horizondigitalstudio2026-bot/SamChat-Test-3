/**
 * SamChat — Routes Authentification
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { handleValidation, sanitizeBody } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

router.post(
  '/register',
  authLimiter,
  sanitizeBody,
  [
    body('username')
      .isLength({ min: 3, max: 24 })
      .withMessage("Le nom d'utilisateur doit contenir entre 3 et 24 caractères.")
      .matches(/^[a-zA-Z0-9_.]+$/)
      .withMessage("Le nom d'utilisateur ne peut contenir que lettres, chiffres, points et underscores."),
    body('email').isEmail().withMessage('Adresse email invalide.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères.'),
    body('displayName').optional().isLength({ max: 50 }),
  ],
  handleValidation,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  sanitizeBody,
  [
    body('identifier').notEmpty().withMessage("Email ou nom d'utilisateur requis."),
    body('password').notEmpty().withMessage('Mot de passe requis.'),
  ],
  handleValidation,
  authController.login
);

router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;