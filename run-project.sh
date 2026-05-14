#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/react-frontend"
BACKEND_PORT="${PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
INSTALL_DEPS=false
PID_DIR="${DIARYNEWS_PID_DIR:-${TMPDIR:-/tmp}/diarynews}"
PID_FILE="$PID_DIR/project.pids"

usage() {
  cat <<'EOF'
Usage: ./run-project.sh [--install]

Starts the DiaryNews backend and frontend together.

Options:
  --install   Install/update Python and frontend dependencies before starting.
  -h, --help  Show this help.

Environment overrides:
  PORT           Backend port, default: 8000
  FRONTEND_PORT  Vite port, default: 5173
  FRONTEND_HOST  Vite host, default: 0.0.0.0
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install)
      INSTALL_DEPS=true
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

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

port_is_busy() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

ensure_deps() {
  require_cmd npm

  if [[ ! -x "$ROOT_DIR/.venv/bin/python" ]]; then
    echo "Python virtualenv is missing at .venv." >&2
    echo "Create it with: python3 -m venv .venv" >&2
    exit 1
  fi

  if [[ "$INSTALL_DEPS" == true ]]; then
    "$ROOT_DIR/.venv/bin/pip" install -r "$ROOT_DIR/requirements.txt"
    npm --prefix "$FRONTEND_DIR" install
  fi

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "Frontend dependencies are missing." >&2
    echo "Run: ./run-project.sh --install" >&2
    exit 1
  fi
}

PIDS=()

descendant_pids() {
  local parent="$1"
  local children child
  children="$(pgrep -P "$parent" 2>/dev/null || true)"
  for child in $children; do
    descendant_pids "$child"
    echo "$child"
  done
}

stop_pid_tree() {
  local pid="$1"
  local child

  for child in $(descendant_pids "$pid"); do
    kill "$child" >/dev/null 2>&1 || true
  done

  kill "$pid" >/dev/null 2>&1 || true
}

write_pid_file() {
  mkdir -p "$PID_DIR"
  {
    echo "mode project"
    echo "backend ${PIDS[0]}"
    echo "frontend ${PIDS[1]}"
  } > "$PID_FILE"
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  if [[ ${#PIDS[@]} -gt 0 ]]; then
    echo
    echo "Stopping DiaryNews..."
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" >/dev/null 2>&1; then
        stop_pid_tree "$pid"
      fi
    done
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
  fi

  rm -f "$PID_FILE"
  exit "$status"
}

trap cleanup EXIT INT TERM

ensure_deps

FRONTEND_SCHEME="http"
if [[ -f "$FRONTEND_DIR/certs/key.pem" && -f "$FRONTEND_DIR/certs/cert.pem" ]]; then
  FRONTEND_SCHEME="https"
fi

if port_is_busy "$BACKEND_PORT"; then
  echo "Backend port $BACKEND_PORT is already in use." >&2
  echo "Set another port with: PORT=8001 ./run-project.sh" >&2
  exit 1
fi

if port_is_busy "$FRONTEND_PORT"; then
  echo "Frontend port $FRONTEND_PORT is already in use." >&2
  echo "Set another port with: FRONTEND_PORT=5174 ./run-project.sh" >&2
  exit 1
fi

echo "Starting DiaryNews..."
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Frontend: $FRONTEND_SCHEME://localhost:$FRONTEND_PORT"
echo "Press Ctrl+C to stop both processes."
echo "Stop from another terminal with: ./stop-project.sh"
echo

(
  cd "$ROOT_DIR"
  PORT="$BACKEND_PORT" "$ROOT_DIR/.venv/bin/python" main.py
) &
PIDS+=("$!")

(
  cd "$FRONTEND_DIR"
  npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"
) &
PIDS+=("$!")

write_pid_file

while :; do
  running_pids="$(jobs -pr)"
  for pid in "${PIDS[@]}"; do
    if ! grep -q "^$pid$" <<<"$running_pids"; then
      wait "$pid" || exit $?
      exit 0
    fi
  done
  sleep 1
done
