/**
 * SamChat — Point d'entrée du serveur
 */

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const config = require('./config/env');
const { registerSocketHandlers } = require('./services/socketService');
const logger = require('./utils/logger');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    credentials: true,
  },
});

registerSocketHandlers(io);

server.listen(config.port, () => {
  logger.info(`SamChat démarré sur http://localhost:${config.port} (${config.nodeEnv})`);
});

process.on('unhandledRejection', (err) => {
  logger.error(`Rejet de promesse non géré : ${err.message}`);
});