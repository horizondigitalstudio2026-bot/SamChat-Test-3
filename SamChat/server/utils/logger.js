/**
 * SamChat — Logger simple (console + fichier)
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const LOG_FILE = path.join(LOG_DIR, 'app.log');

function write(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  // eslint-disable-next-line no-console
  console[level === 'ERROR' ? 'error' : 'log'](line);
  fs.appendFile(LOG_FILE, line + '\n', () => {});
}

module.exports = {
  info: (msg) => write('INFO', msg),
  warn: (msg) => write('WARN', msg),
  error: (msg) => write('ERROR', msg),
};