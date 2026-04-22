'use strict';

/**
 * @param {import('express').Application} app
 * @param {{ path?: string, dbCheck?: boolean, extraChecks?: Array<() => Promise<{ok: boolean, name: string, detail?: string}>> }} [options]
 */
function health(app, options = {}) {
  const { path = '', dbCheck = true, extraChecks = [] } = options;

  app.get(`${path}/health`, (_req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
  });

  app.get(`${path}/ready`, async (_req, res) => {
    const result = { status: 'READY', timestamp: new Date().toISOString() };

    if (dbCheck) {
      try {
        const cds = require('@sap/cds');
        await cds.run('SELECT 1 FROM DUMMY').catch(() => cds.run(cds.parse.expr('SELECT 1')));
        result.db = 'connected';
      } catch (err) {
        return res.status(503).json({ status: 'NOT_READY', reason: `DB check failed: ${err.message}` });
      }
    }

    for (const check of extraChecks) {
      try {
        const { ok, name, detail } = await check();
        if (!ok) {
          return res.status(503).json({ status: 'NOT_READY', reason: `Check '${name}' failed${detail ? ': ' + detail : ''}` });
        }
      } catch (err) {
        return res.status(503).json({ status: 'NOT_READY', reason: err.message });
      }
    }

    res.status(200).json(result);
  });
}

module.exports = { health };
