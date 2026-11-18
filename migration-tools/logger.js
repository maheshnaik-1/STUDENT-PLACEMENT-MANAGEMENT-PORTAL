/**
 * logger.js
 * Standardized logger for the migration runner.
 * Automatically redacts passwords, credentials, and authentication secrets.
 */

const SECRET_PATTERNS = [
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, // mongodb credentials
  /mysql:\/\/[^:]+:[^@]+@/gi,          // mysql credentials
  /\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}/g, // BCrypt hash
  /password['"]?\s*[:=]\s*['"][^'"]+['"]/gi, // password assignments
];

function redact(message) {
  if (typeof message !== 'string') {
    try {
      message = JSON.stringify(message);
    } catch (_) {
      message = String(message);
    }
  }

  let sanitized = message;
  // Redact connection strings
  sanitized = sanitized.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/gi, 'mongodb$1://$2:***@');
  sanitized = sanitized.replace(/mysql:\/\/([^:]+):([^@]+)@/gi, 'mysql://$1:***@');
  // Redact BCrypt hashes
  sanitized = sanitized.replace(/\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}/g, '[REDACTED_BCRYPT_HASH]');
  // Redact password fields in key-value format
  sanitized = sanitized.replace(/password['"]?\s*:\s*['"][^'"]+['"]/gi, '"password":"[REDACTED]"');

  return sanitized;
}

const Logger = {
  info(msg, ...args) {
    console.log(`[INFO]  ${redact(msg)}`, ...args.map(redact));
  },
  success(msg, ...args) {
    console.log(`[OK]    ${redact(msg)}`, ...args.map(redact));
  },
  warn(msg, ...args) {
    console.warn(`[WARN]  ${redact(msg)}`, ...args.map(redact));
  },
  error(msg, ...args) {
    console.error(`[ERROR] ${redact(msg)}`, ...args.map(redact));
  },
  debug(msg, ...args) {
    if (process.env.DEBUG_MIGRATION === 'true') {
      console.log(`[DEBUG] ${redact(msg)}`, ...args.map(redact));
    }
  },
  banner(title) {
    const line = '='.repeat(70);
    console.log(`\n${line}\n  ${title}\n${line}`);
  },
  section(title) {
    console.log(`\n--- ${title} ---`);
  },
  redact
};

module.exports = Logger;
