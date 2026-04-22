'use strict';

const DEFAULT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

function buildCsp(directives) {
  if (!directives || Object.keys(directives).length === 0) return DEFAULT_CSP;
  const base = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    ...directives,
  };
  return Object.entries(base)
    .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join(' ') : v}`)
    .join('; ');
}

/**
 * @param {import('express').Application} app
 * @param {{ hsts?: boolean, csp?: boolean, cspDirectives?: object }} [options]
 */
function helmet(app, options = {}) {
  const { hsts = true, csp = true, cspDirectives = {} } = options;

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');

    if (hsts) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (csp) {
      res.setHeader('Content-Security-Policy', buildCsp(cspDirectives));
    }

    next();
  });
}

module.exports = { helmet, buildCsp };
