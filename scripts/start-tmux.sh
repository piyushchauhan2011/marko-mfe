#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v tmux >/dev/null 2>&1; then
  if tmux has-session -t marko-mfe 2>/dev/null; then
    tmux attach-session -t marko-mfe
  else
    tmux new-session -d -s marko-mfe -x 220 -y 50
    tmux send-keys -t marko-mfe "cd '$(pwd)' && pnpm dev" Enter
    tmux new-window -t marko-mfe -n hotel-details
    tmux send-keys -t marko-mfe:hotel-details "cd '$(pwd)/apps/hotel-details' && pnpm dev" Enter
    tmux select-window -t marko-mfe:0
    tmux attach-session -t marko-mfe
  fi
else
  echo "tmux is not installed"
  echo ""
  echo "To run the services:"
  echo "  Terminal 1: pnpm dev           # Runs all services except hotel-details"
  echo "  Terminal 2: pnpm dev:hotel-details  # Runs hotel-details separately"
  echo ""
  echo "Or run all together with: pnpm dev:all"
fi
