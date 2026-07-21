/**
 * SamChat — Routes Conversations & Messages
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const conversationController = require('../controllers/conversationController');
const { authenticate } = require('../middleware/auth');
const { handleValidation, sanitizeBody } = require('../middleware/validate');

router.use(authenticate);

router.get('/', conversationController.listConversations);

router.post(
  '/private',
  sanitizeBody,
  [body('userId').notEmpty().withMessage('userId requis.')],
  handleValidation,
  conversationController.openPrivateConversation
);

router.post(
  '/group',
  sanitizeBody,
  [body('name').notEmpty().withMessage('Le nom du groupe est requis.')],
  handleValidation,
  conversationController.createGroup
);

router.get('/:id/messages', conversationController.getMessages);

module.exports = router;