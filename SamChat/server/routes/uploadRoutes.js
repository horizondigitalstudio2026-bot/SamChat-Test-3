/**
 * SamChat — Route d'upload de fichiers (images, vidéos, audio, documents)
 * Le fichier est stocké sur disque ; l'URL renvoyée est ensuite utilisée
 * pour créer un message de type média via Socket.IO.
 */

const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });

  const folder = req.file.destination.split('/').pop();
  res.status(201).json({
    url: `/uploads/${folder}/${req.file.filename}`,
    mimetype: req.file.mimetype,
    originalName: req.file.originalname,
    size: req.file.size,
  });
});

module.exports = router;