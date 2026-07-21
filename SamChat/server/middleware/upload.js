/**
 * SamChat — Configuration des uploads (Multer)
 * Les fichiers sont répartis par type dans /uploads/{images,videos,audio,documents}
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

const TYPE_FOLDERS = {
  'image/': 'images',
  'video/': 'videos',
  'audio/': 'audio',
};

function resolveFolder(mimetype) {
  const entry = Object.entries(TYPE_FOLDERS).find(([prefix]) => mimetype.startsWith(prefix));
  return entry ? entry[1] : 'documents';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = resolveFolder(file.mimetype);
    const fullPath = path.join(UPLOAD_ROOT, folder);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSizeMb * 1024 * 1024 },
});

module.exports = upload;