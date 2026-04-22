'use strict';
const assert = require('assert');
const { helmet, buildCsp } = require('../src/helmet');

function makeApp() {
  const middlewares = [];
  return {
    use: (fn) => middlewares.push(fn),
    middlewares,
  };
}

function makeRes() {
  const headers = {};
  return { setHeader: (k, v) => { headers[k] = v; }, headers };
}

function runMiddleware(app, req, res) {
  return new Promise((resolve) => app.middlewares[0](req, res, resolve));
}

describe('helmet', () => {
  it('sets security headers by default', async () => {
    const app = makeApp();
    helmet(app);
    const res = makeRes();
    await runMiddleware(app, {}, res);
    assert.strictEqual(res.headers['X-Content-Type-Options'], 'nosniff');
    assert.strictEqual(res.headers['X-Frame-Options'], 'DENY');
    assert.strictEqual(res.headers['Referrer-Policy'], 'no-referrer');
    assert.ok(res.headers['Strict-Transport-Security'].includes('max-age=31536000'));
    assert.ok(res.headers['Content-Security-Policy'].includes("default-src 'self'"));
  });

  it('omits HSTS when hsts: false', async () => {
    const app = makeApp();
    helmet(app, { hsts: false });
    const res = makeRes();
    await runMiddleware(app, {}, res);
    assert.strictEqual(res.headers['Strict-Transport-Security'], undefined);
  });

  it('omits CSP when csp: false', async () => {
    const app = makeApp();
    helmet(app, { csp: false });
    const res = makeRes();
    await runMiddleware(app, {}, res);
    assert.strictEqual(res.headers['Content-Security-Policy'], undefined);
  });

  it('buildCsp merges custom directives', () => {
    const csp = buildCsp({ 'script-src': ["'self'", 'cdn.example.com'] });
    assert.ok(csp.includes("script-src 'self' cdn.example.com"));
  });

  it('buildCsp returns default when no directives given', () => {
    const csp = buildCsp({});
    assert.ok(csp.includes("default-src 'self'"));
  });
});
