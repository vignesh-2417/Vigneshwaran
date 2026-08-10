#!/usr/bin/env bash
set -euo pipefail

echo "==> Verifying Git toolchain"
git --version

if ! git config --global user.email >/dev/null 2>&1; then
  git config --global user.email "cloud-agent@cursor.com"
fi

if ! git config --global user.name >/dev/null 2>&1; then
  git config --global user.name "Cloud Agent"
fi

if ! git config --global init.defaultBranch >/dev/null 2>&1; then
  git config --global init.defaultBranch main
fi

echo "==> Repository bootstrap complete"
