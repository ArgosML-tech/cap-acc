#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
GENERATED_DIR="$SCRIPT_DIR/generated"
CAPX="node $ROOT_DIR/packages/cli/bin/capx.js"

echo "=== Building CLI ==="
cd "$ROOT_DIR"
npm run build --workspace=packages/cli

echo ""
echo "=== Cleaning generated/ ==="
rm -rf "$GENERATED_DIR"
mkdir -p "$GENERATED_DIR"

echo ""
echo "=== capx new integration-service test-app ==="
cd "$GENERATED_DIR"
$CAPX new integration-service test-app
cd test-app

echo ""
echo "=== npm install ==="
npm install

echo ""
echo "=== npm test (baseline) ==="
npm test

echo ""
echo "=== capx add draft-entity ==="
CAPX_PRESET='{"name":"Approval","namespace":"my.company","withSeed":true}' \
  $CAPX add draft-entity

echo ""
echo "=== cds build after draft-entity ==="
npx cds build

echo ""
echo "=== capx add mocked-auth ==="
CAPX_PRESET='{"roles":["admin","viewer"]}' \
  $CAPX add mocked-auth

echo ""
echo "=== capx add action-tests ==="
CAPX_PRESET='{"service":"IntegrationService","action":"process","bound":"unbound","entity":""}' \
  $CAPX add action-tests

echo ""
echo "=== npm test (full suite) ==="
npm test

echo ""
echo "✓ All generator tests passed!"
