#!/usr/bin/env bash
set -euo pipefail

# start-all.sh
# Inicia backend e frontend do projeto, redireciona logs para logs/, salva PIDs e faz tail dos logs.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"
BACK_LOG="$LOG_DIR/backend.log"
FRONT_LOG="$LOG_DIR/frontend.log"
PIDS_FILE="$ROOT/.start-all-pids"

# Portas utilizadas
BACKEND_PORT=3000
FRONTEND_PORT=8081

INSTALL=false
NO_WAIT=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --install) INSTALL=true; shift ;;
    --no-wait) NO_WAIT=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--install] [--no-wait]"
      echo "  --install   run npm install in backend and frontend before starting"
      echo "  --no-wait   start processes in background and exit (do not tail logs)"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Função para matar processo em uma porta específica
kill_port() {
  local port=$1
  local pids
  pids=$(fuser "${port}/tcp" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Matando processos na porta $port: $pids"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
  fi
}

# Limpar portas antes de iniciar
echo "Limpando portas $BACKEND_PORT e $FRONTEND_PORT..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

if $INSTALL ; then
  echo "Installing dependencies..."
  (cd "$BACKEND_DIR" && npm install)
  (cd "$FRONTEND_DIR" && npm install)
fi

# Limpar logs antigos
> "$BACK_LOG"
> "$FRONT_LOG"

echo "Starting backend na porta $BACKEND_PORT (logs -> $BACK_LOG)"
cd "$BACKEND_DIR"
npm start >> "$BACK_LOG" 2>&1 &
BACK_PID=$!
echo $BACK_PID > "$ROOT/.backend.pid"
echo "backend PID: $BACK_PID"

echo "Starting frontend na porta $FRONTEND_PORT (logs -> $FRONT_LOG)"
cd "$FRONTEND_DIR"
npm run dev -- --port $FRONTEND_PORT >> "$FRONT_LOG" 2>&1 &
FRONT_PID=$!
echo $FRONT_PID > "$ROOT/.frontend.pid"
echo "frontend PID: $FRONT_PID"

echo "backend=$BACK_PID" > "$PIDS_FILE"
echo "frontend=$FRONT_PID" >> "$PIDS_FILE"

echo ""
echo "=========================================="
echo "✅ Serviços iniciados!"
echo "   Backend:  http://localhost:$BACKEND_PORT (health: /health)"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo "   Admin:    http://localhost:$FRONTEND_PORT/admin"
echo "=========================================="

cleanup() {
  echo ""
  echo "Parando serviços..."
  kill_port $BACKEND_PORT
  kill_port $FRONTEND_PORT
  [[ -f "$ROOT/.frontend.pid" ]] && kill "$(cat "$ROOT/.frontend.pid")" 2>/dev/null || true
  [[ -f "$ROOT/.backend.pid" ]] && kill "$(cat "$ROOT/.backend.pid")" 2>/dev/null || true
  rm -f "$ROOT/.frontend.pid" "$ROOT/.backend.pid" "$PIDS_FILE"
  exit 0
}

trap cleanup INT TERM

if ! $NO_WAIT ; then
  echo "Tailing logs (pressione Ctrl-C para parar os serviços)..."
  echo ""
  # tail both logs; when user hits Ctrl-C trap triggers cleanup
  tail -n +1 -f "$BACK_LOG" "$FRONT_LOG"
else
  echo "Started in background (--no-wait). PIDs saved to $PIDS_FILE"
fi
