'use strict';

function createLogger(component) {
  const prefix = `[${component}]`;

  function fmt(level, message, meta = {}) {
    const cid = meta.correlationId || '-';
    return `${new Date().toISOString()} ${level} ${prefix} [${cid}] ${message}`;
  }

  return {
    info:  (msg, meta) => console.log(fmt('INFO ', msg, meta)),
    warn:  (msg, meta) => console.warn(fmt('WARN ', msg, meta)),
    error: (msg, meta) => console.error(fmt('ERROR', msg, meta)),
    debug: (msg, meta) => { if (process.env.DEBUG) console.log(fmt('DEBUG', msg, meta)); },
  };
}

module.exports = { createLogger };
