#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/react-frontend"
CADDY_CONFIG="$ROOT_DIR/deploy/cloudflare/Caddyfile"
PID_DIR="${DIARYNEWS_PID_DIR:-${TMPDIR:-/tmp}/diarynews}"
STOP_MODE="all"

usage() {
  cat <<'EOF'
Usage: ./stop-project.sh [--dev|--public|--all]

Stops processes started by the DiaryNews runner scripts.

Options:
  --dev      Stop processes from ./run-project.sh
  --public   Stop processes from ./run-public.sh
  --all      Stop both dev and public stacks (default)
  -h, --help Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      STOP_MODE="dev"
      ;;
    --public)
      STOP_MODE="public"
      ;;
    --all)
      STOP_MODE="all"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

descendant_pids() {
  local parent="$1"
  local children child
  children="$(pgrep -P "$parent" 2>/dev/null || true)"
  for child in $children; do
    descendant_pids "$child"
    echo "$child"
  done
}

pid_is_alive() {
  ps -p "$1" -o pid= >/dev/null 2>&1
}

stop_pid_tree() {
  local pid="$1"
  local child

  if ! pid_is_alive "$pid"; then
    return 0
  fi

  for child in $(descendant_pids "$pid"); do
    kill "$child" >/dev/null 2>&1 || true
  done
  kill "$pid" >/dev/null 2>&1 || true
}

force_pid_tree() {
  local pid="$1"
  local child

  if ! pid_is_alive "$pid"; then
    return 0
  fi

  for child in $(descendant_pids "$pid"); do
    kill -KILL "$child" >/dev/null 2>&1 || true
  done
  kill -KILL "$pid" >/dev/null 2>&1 || true
}

read_pids() {
  local file="$1"
  awk '/^[a-zA-Z_-]+ [0-9]+$/ {print $2}' "$file"
}

stop_pid_file() {
  local label="$1"
  local file="$2"
  local pid
  local pids
  local live_before=0
  local live_after=0

  if [[ ! -f "$file" ]]; then
    echo "$label stack: no PID file found."
    return 0
  fi

  echo "Stopping $label stack..."
  pids=($(read_pids "$file"))

  for pid in "${pids[@]}"; do
    if pid_is_alive "$pid"; then
      live_before=$((live_before + 1))
      stop_pid_tree "$pid"
    fi
  done

  sleep 2

  for pid in "${pids[@]}"; do
    if pid_is_alive "$pid"; then
      force_pid_tree "$pid"
    fi
  done

  sleep 1

  for pid in "${pids[@]}"; do
    if pid_is_alive "$pid"; then
      live_after=$((live_after + 1))
    fi
  done

  if [[ "$live_after" -eq 0 ]]; then
    rm -f "$file"
  fi

  if [[ "$live_before" -eq 0 ]]; then
    rm -f "$file"
    echo "$label stack had no live processes."
  elif [[ "$live_after" -eq 0 ]]; then
    echo "$label stack stopped."
  else
    echo "$label stack still has $live_after live process(es). Try again with sufficient permissions."
    return 1
  fi
}

matching_dev_pids() {
  ps -axo pid=,command= | awk \
    -v backend="$ROOT_DIR/.venv/bin/python main.py" \
    -v vite="$FRONTEND_DIR/node_modules/.bin/vite" \
    'index($0, backend) || index($0, vite) {print $1}'
}

matching_public_pids() {
  ps -axo pid=,command= | awk \
    -v backend="$ROOT_DIR/.venv/bin/python main.py" \
    -v caddy="caddy run --config " \
    -v caddy_config="$CADDY_CONFIG" \
    'index($0, backend) || (index($0, caddy) && index($0, caddy_config)) {print $1}'
}

stop_matching_pids() {
  local label="$1"
  shift
  local pids=("$@")
  local pid
  local stopped=0

  for pid in "${pids[@]}"; do
    if [[ -n "$pid" && "$pid" != "$$" ]] && pid_is_alive "$pid"; then
      stop_pid_tree "$pid"
      stopped=$((stopped + 1))
    fi
  done

  if [[ "$stopped" -gt 0 ]]; then
    sleep 1
    for pid in "${pids[@]}"; do
      if [[ -n "$pid" && "$pid" != "$$" ]] && pid_is_alive "$pid"; then
        force_pid_tree "$pid"
      fi
    done
    echo "Stopped $stopped matching $label process(es)."
  fi
}

case "$STOP_MODE" in
  dev)
    stop_pid_file "dev" "$PID_DIR/project.pids"
    dev_pids=($(matching_dev_pids))
    stop_matching_pids "dev" "${dev_pids[@]}"
    ;;
  public)
    stop_pid_file "public" "$PID_DIR/public.pids"
    public_pids=($(matching_public_pids))
    stop_matching_pids "public" "${public_pids[@]}"
    ;;
  all)
    stop_pid_file "dev" "$PID_DIR/project.pids"
    stop_pid_file "public" "$PID_DIR/public.pids"
    dev_pids=($(matching_dev_pids))
    public_pids=($(matching_public_pids))
    stop_matching_pids "dev" "${dev_pids[@]}"
    stop_matching_pids "public" "${public_pids[@]}"
    ;;
esac
