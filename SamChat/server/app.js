/**
 * SamChat — Configuration de l'application Express
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const config = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// --- Sécurité de base ---
app.use(
  helmet({
    contentSecurityPolicy: false, // désactivé en dev pour permettre les CDN ; à durcir en production
  })
);
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// --- Parsing ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Limitation de débit globale ---
app.use('/api', generalLimiter);

// --- Fichiers statiques ---
app.use(express.static(path.join(__dirname, '../client/public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- Routes API ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SamChat', timestamp: new Date().toISOString() });
});

// --- Route de secours : sert l'app cliente (SPA) ---
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

// --- Gestion des erreurs ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;