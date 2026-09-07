.PHONY: help dev tmux stop

TMUX_SESSION ?= marko-mfe
ROOT_DIR := $(CURDIR)
APP_PORTS := 3100 3101 3102 3103 3104 3105 3106 3200

help:
	@echo "Available commands:"
	@echo "  make dev      Start the monorepo with tmux"
	@echo "  make tmux     Start or attach to the tmux session"
	@echo "  make stop     Stop tmux and kill any app ports in use"

# Start the entire monorepo in tmux, attaching to the session.
dev: tmux

tmux:
	@if command -v tmux >/dev/null 2>&1; then \
		if tmux has-session -t $(TMUX_SESSION) 2>/dev/null; then \
			echo "Reusing tmux session $(TMUX_SESSION)"; \
			tmux attach-session -t $(TMUX_SESSION); \
		else \
			tmux new-session -d -s $(TMUX_SESSION) -x 220 -y 50; \
			tmux send-keys -t $(TMUX_SESSION) "cd '$(ROOT_DIR)' && pnpm dev" C-m; \
			tmux new-window -t $(TMUX_SESSION) -n hotel-details; \
			tmux send-keys -t $(TMUX_SESSION):hotel-details "cd '$(ROOT_DIR)/apps/hotel-details' && pnpm dev" C-m; \
			tmux select-window -t $(TMUX_SESSION):0; \
			echo "Started tmux session $(TMUX_SESSION)."; \
			echo "Use: tmux attach -t $(TMUX_SESSION)"; \
			tmux attach-session -t $(TMUX_SESSION); \
		fi; \
	else \
		echo "tmux is not installed. Please install it or run 'pnpm dev' manually."; \
		exit 1; \
	fi

# Stop any tmux session and any local Node app processes bound to the known app ports.
stop:
	@if tmux has-session -t $(TMUX_SESSION) 2>/dev/null; then \
		tmux kill-session -t $(TMUX_SESSION); \
		echo "Stopped tmux session $(TMUX_SESSION)"; \
	else \
		echo "No tmux session named $(TMUX_SESSION) was running."; \
	fi; \
	for port in $(APP_PORTS); do \
		pids=""; \
		if command -v lsof >/dev/null 2>&1; then \
			pids="$$(lsof -ti tcp:$$port -sTCP:LISTEN 2>/dev/null || true)"; \
		elif command -v fuser >/dev/null 2>&1; then \
			pids="$$(fuser -n tcp $$port 2>/dev/null || true)"; \
		elif command -v ss >/dev/null 2>&1; then \
			pids="$$(ss -lntp 2>/dev/null | awk -v port="$$port" '$4 ~ (":" port "$$") { if (match($0, /pid=([0-9]+)/, m)) print m[1] }' | tr '\n' ' ')"; \
		fi; \
		if [ -n "$$pids" ]; then \
			for pid in $$pids; do \
				if [ -n "$$pid" ]; then \
					echo "Stopping process $$pid on port $$port"; \
					kill $$pid 2>/dev/null || true; \
					sleep 1; \
					kill -9 $$pid 2>/dev/null || true; \
				fi; \
			done; \
		fi; \
	done; \
	echo "Stopped app processes on ports: $(APP_PORTS)";
