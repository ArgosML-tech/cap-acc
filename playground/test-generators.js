#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const ROOT_DIR   = path.join(SCRIPT_DIR, '..');
const CAPX       = `node ${path.join(ROOT_DIR, 'packages/cli/bin/capx.js')}`;

// Use a timestamp-based run dir so we never have to delete locked node_modules on Windows
const RUN_ID   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const RUN_DIR  = path.join(SCRIPT_DIR, 'generated', RUN_ID);
const APP_NAME = 'my-app';
const APP      = path.join(RUN_DIR, APP_NAME);

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function step(title) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(50));
}

// ── Build CLI ──────────────────────────────────────────
step('Building CLI');
run('npm run build --workspace=packages/cli', { cwd: ROOT_DIR });

// ── Prepare run dir ───────────────────────────────────
step(`Preparing run dir: generated/${RUN_ID}`);
fs.mkdirSync(RUN_DIR, { recursive: true });

// ── capx new ──────────────────────────────────────────
step(`capx new integration-service ${APP_NAME}`);
run(`${CAPX} new integration-service ${APP_NAME}`, { cwd: RUN_DIR });

step('npm install');
run('npm install', { cwd: APP });

step('npm test (baseline)');
run('npm test', { cwd: APP });

// ── capx add draft-entity ─────────────────────────────
step('capx add draft-entity');
run(`${CAPX} add draft-entity`, {
  cwd: APP,
  env: {
    ...process.env,
    CAPX_PRESET: JSON.stringify({ name: 'Approval', namespace: 'my.company', withSeed: true }),
  },
});

step('cds build');
run('npx cds build', { cwd: APP });

// ── capx add mocked-auth ──────────────────────────────
step('capx add mocked-auth');
run(`${CAPX} add mocked-auth`, {
  cwd: APP,
  env: {
    ...process.env,
    CAPX_PRESET: JSON.stringify({ roles: ['admin', 'viewer'] }),
  },
});

// ── capx add action-tests ─────────────────────────────
step('capx add action-tests');
run(`${CAPX} add action-tests`, {
  cwd: APP,
  env: {
    ...process.env,
    CAPX_PRESET: JSON.stringify({
      service: 'IntegrationService',
      action: 'process',
      bound: 'unbound',
      entity: '',
    }),
  },
});

// ── capx add audit-trail ─────────────────────────────
step('capx add audit-trail');
run(`${CAPX} add audit-trail`, {
  cwd: APP,
  env: {
    ...process.env,
    CAPX_PRESET: JSON.stringify({
      entity:    'IntegrationItem',
      service:   'IntegrationService',
      namespace: 'my.app',
    }),
  },
});

// ── capx add comments ────────────────────────────────
step('capx add comments');
run(`${CAPX} add comments`, {
  cwd: APP,
  env: {
    ...process.env,
    CAPX_PRESET: JSON.stringify({
      entity:    'IntegrationItem',
      service:   'IntegrationService',
      namespace: 'my.app',
    }),
  },
});

step('cds build (after phase-2 generators)');
run('npx cds build', { cwd: APP });

// ── Full test suite ───────────────────────────────────
step('npm test (full suite)');
run('npm test', { cwd: APP });

console.log('\n✓ All generator tests passed!\n');
console.log(`  Run artifacts: generated/${RUN_ID}\n`);
