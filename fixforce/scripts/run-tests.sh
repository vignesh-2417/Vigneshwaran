#!/usr/bin/env bash
# Run all FixForce Node.js tests
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

echo "==> Smoke tests (test-classifier.js)"
node test-classifier.js

echo ""
echo "==> Hard cases (test-hard-cases.js)"
node test-hard-cases.js

echo ""
echo "All tests passed."
