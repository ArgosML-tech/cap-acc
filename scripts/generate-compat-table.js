'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const matrixPath = path.join(__dirname, 'compat-matrix.json');
const outputPath = path.join(root, 'docs', 'compatibility.md');

const { updated, matrix } = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

const cfIcon = (v) => (v === 'supported' ? '✅' : v === 'not-supported' ? '❌' : v);

const header = [
  '# Tabla de compatibilidad de versiones',
  '',
  `> Actualizada: ${updated}`,
  '',
  '| @sap/cds | Node.js | @cap-js/sqlite | @cap-js/hana | CF | Kyma | Notas |',
  '|---|---|---|---|---|---|---|',
].join('\n');

const rows = matrix
  .map((r) => `| ${r.cds} | ${r.node} | ${r.sqlite} | ${r.hana} | ${cfIcon(r.cf)} | ${cfIcon(r.kyma)} | ${r.notes} |`)
  .join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${header}\n${rows}\n`, 'utf8');

console.log(`Generated: ${path.relative(root, outputPath)}`);
