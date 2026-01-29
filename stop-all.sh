#!/usr/bin/env bash
set -euo pipefail

# stop-all.sh
# Para backend e frontend iniciados pelo start-all.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS_FILE="$ROOT/.start-all-pids"
BACK_PID_FILE="$ROOT/.backend.pid"
FRONT_PID_FILE="$ROOT/.frontend.pid"

# Portas utilizadas
BACKEND_PORT=3000
FRONTEND_PORT=8080

echo "Parando serviços..."

# Função para matar processo em uma porta específica
kill_port() {
  local port=$1
  local pids
  pids=$(fuser "${port}/tcp" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Matando processos na porta $port: $pids"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 0.5
    # Se ainda estiver rodando, força com SIGKILL
    pids=$(fuser "${port}/tcp" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      echo "Forçando kill na porta $port"
      fuser -k -9 "${port}/tcp" 2>/dev/null || true
    fi
  else
    echo "Nenhum processo na porta $port"
  fi
}

# Função para matar por arquivo de PID
kill_if_file() {
  local f=$1
  if [[ -f "$f" ]]; then
    local pid
    pid=$(cat "$f")
    if [[ -n "$pid" ]]; then
      echo "Matando PID $pid de $f"
      kill "$pid" 2>/dev/null || true
      sleep 0.5
      if kill -0 "$pid" 2>/dev/null; then
        echo "PID $pid ainda rodando, enviando SIGKILL"
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$f"
  fi
}

# Matar por porta (mais confiável)
echo ""
echo "Limpando porta $BACKEND_PORT (backend)..."
kill_port $BACKEND_PORT

echo "Limpando porta $FRONTEND_PORT (frontend)..."
kill_port $FRONTEND_PORT

# Também tentar por PID files (backup)
if [[ -f "$PIDS_FILE" ]]; then
  echo ""
  echo "Limpando PIDs de $PIDS_FILE..."
  while IFS== read -r key val; do
    if [[ -n "$val" ]]; then
      echo "Matando $key => $val"
      kill "$val" 2>/dev/null || true
    fi
  done < "$PIDS_FILE"
  rm -f "$PIDS_FILE"
fi

kill_if_file "$BACK_PID_FILE"
kill_if_file "$FRONT_PID_FILE"

# Matar qualquer processo node remanescente do projeto
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite.*$FRONTEND_PORT" 2>/dev/null || true

echo ""
echo "✅ Serviços parados!"
