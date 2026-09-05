#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v tmux >/dev/null 2>&1; then
  if tmux has-session -t marko-mfe 2>/dev/null; then
    tmux attach-session -t marko-mfe
  else
    tmux new-session -d -s marko-mfe "cd '$(pwd)' && pnpm dev"
    tmux attach-session -t marko-mfe
  fi
else
  echo "tmux is not installed; falling back to pnpm dev"
  pnpm dev
fi
