#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/react-frontend"
CADDY_CONFIG="${CADDY_CONFIG:-$ROOT_DIR/deploy/cloudflare/Caddyfile}"
CLOUDFLARED_CONFIG="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"
PUBLIC_HOSTNAME="${PUBLIC_HOSTNAME:-app.huarenpt.com}"
BACKEND_PORT="${PORT:-8000}"
CADDY_PORT="${CADDY_PORT:-8080}"
INSTALL_DEPS=false
SKIP_BUILD=false
PID_DIR="${DIARYNEWS_PID_DIR:-${TMPDIR:-/tmp}/diarynews}"
PID_FILE="$PID_DIR/public.pids"

usage() {
  cat <<'EOF'
Usage: ./run-public.sh [--install] [--skip-build]

Builds the React app, starts FastAPI, serves the build with Caddy, and starts
Cloudflare Tunnel so the site is available at https://app.huarenpt.com.

Options:
  --install     Install/update Python and frontend dependencies first.
  --skip-build  Reuse the existing react-frontend/dist build.
  -h, --help    Show this help.

Environment overrides:
  PUBLIC_HOSTNAME     Public hostname, default: app.huarenpt.com
  PORT                Backend port, default: 8000
  CADDY_PORT          Expected Caddy port, default: 8080
  CADDY_CONFIG        Caddy config path
  CLOUDFLARED_CONFIG  Cloudflared config path, default: ~/.cloudflared/config.yml
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install)
      INSTALL_DEPS=true
      ;;
    --skip-build)
      SKIP_BUILD=true
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
  require_cmd caddy
  require_cmd cloudflared

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
    echo "Run: ./run-public.sh --install" >&2
    exit 1
  fi

  if [[ ! -f "$CADDY_CONFIG" ]]; then
    echo "Caddy config not found: $CADDY_CONFIG" >&2
    exit 1
  fi

  if [[ ! -f "$CLOUDFLARED_CONFIG" ]]; then
    echo "Cloudflared config not found: $CLOUDFLARED_CONFIG" >&2
    echo "Create it with the steps in docs/cloudflare-public-access.md." >&2
    exit 1
  fi

  if ! grep -q "hostname: $PUBLIC_HOSTNAME" "$CLOUDFLARED_CONFIG"; then
    echo "Cloudflared config does not route $PUBLIC_HOSTNAME." >&2
    echo "Update $CLOUDFLARED_CONFIG and run:" >&2
    echo "  cloudflared tunnel route dns diarynews $PUBLIC_HOSTNAME" >&2
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
    echo "mode public"
    echo "backend ${PIDS[0]}"
    echo "caddy ${PIDS[1]}"
    echo "cloudflared ${PIDS[2]}"
  } > "$PID_FILE"
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  if [[ ${#PIDS[@]} -gt 0 ]]; then
    echo
    echo "Stopping DiaryNews public stack..."
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

if port_is_busy "$BACKEND_PORT"; then
  echo "Backend port $BACKEND_PORT is already in use." >&2
  exit 1
fi

if port_is_busy "$CADDY_PORT"; then
  echo "Caddy port $CADDY_PORT is already in use." >&2
  exit 1
fi

if [[ "$SKIP_BUILD" != true ]]; then
  npm --prefix "$FRONTEND_DIR" run build
fi

if [[ ! -d "$FRONTEND_DIR/dist" ]]; then
  echo "Frontend build is missing at react-frontend/dist." >&2
  echo "Run: ./run-public.sh" >&2
  exit 1
fi

echo "Starting DiaryNews public stack..."
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Caddy:    http://localhost:$CADDY_PORT"
echo "Public:   https://$PUBLIC_HOSTNAME"
echo "Press Ctrl+C to stop all processes."
echo "Stop from another terminal with: ./stop-project.sh"
echo

(
  cd "$ROOT_DIR"
  ENV=production PORT="$BACKEND_PORT" SITE_URL="https://$PUBLIC_HOSTNAME" "$ROOT_DIR/.venv/bin/python" main.py
) &
PIDS+=("$!")

(
  caddy run --config "$CADDY_CONFIG"
) &
PIDS+=("$!")

(
  cloudflared tunnel --config "$CLOUDFLARED_CONFIG" run
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
