/**
 * SamChat — Routes Utilisateurs & Contacts
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { handleValidation, sanitizeBody } = require('../middleware/validate');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/search', userController.search);

router.put(
  '/profile',
  upload.single('avatar'),
  sanitizeBody,
  [
    body('displayName').optional().isLength({ max: 50 }),
    body('bio').optional().isLength({ max: 200 }),
    body('theme').optional().isString(),
  ],
  handleValidation,
  userController.updateProfile
);

router.get('/contacts', userController.listContacts);
router.post(
  '/contacts',
  sanitizeBody,
  [body('contactId').notEmpty().withMessage('contactId requis.')],
  handleValidation,
  userController.addContact
);
router.delete('/contacts/:contactId', userController.removeContact);

module.exports = router;