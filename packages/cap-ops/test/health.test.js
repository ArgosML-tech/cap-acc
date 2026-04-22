'use strict';
const assert = require('assert');
const { health } = require('../src/health');

function makeApp() {
  const routes = {};
  return {
    get: (path, handler) => { routes[path] = handler; },
    routes,
  };
}

function makeRes() {
  const self = {
    statusCode: 200,
    body: null,
    status(code) { self.statusCode = code; return self; },
    json(body) { self.body = body; },
  };
  return self;
}

describe('health', () => {
  it('GET /health returns 200 UP', async () => {
    const app = makeApp();
    health(app, { dbCheck: false });
    const res = makeRes();
    await app.routes['/health']({}, res);
    assert.strictEqual(res.body.status, 'UP');
    assert.ok(res.body.timestamp);
  });

  it('GET /ready returns 200 READY when dbCheck is disabled', async () => {
    const app = makeApp();
    health(app, { dbCheck: false });
    const res = makeRes();
    await app.routes['/ready']({}, res);
    assert.strictEqual(res.body.status, 'READY');
  });

  it('GET /ready returns 503 when extraCheck fails', async () => {
    const app = makeApp();
    health(app, {
      dbCheck: false,
      extraChecks: [async () => ({ ok: false, name: 'external', detail: 'timeout' })],
    });
    const res = makeRes();
    await app.routes['/ready']({}, res);
    assert.strictEqual(res.body.status, 'NOT_READY');
    assert.ok(res.body.reason.includes('external'));
  });

  it('GET /ready returns 503 when extraCheck throws', async () => {
    const app = makeApp();
    health(app, {
      dbCheck: false,
      extraChecks: [async () => { throw new Error('boom'); }],
    });
    const res = makeRes();
    await app.routes['/ready']({}, res);
    assert.strictEqual(res.body.status, 'NOT_READY');
    assert.ok(res.body.reason.includes('boom'));
  });

  it('supports custom path prefix', async () => {
    const app = makeApp();
    health(app, { dbCheck: false, path: '/ops' });
    assert.ok(app.routes['/ops/health']);
    assert.ok(app.routes['/ops/ready']);
  });
});
