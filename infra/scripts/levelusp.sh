#!/usr/bin/env bash
# Equivalente em Bash do levelusp.ps1 (Linux, macOS, WSL ou VM da USP).
# Uso: infra/scripts/levelusp.sh <setup|up|down|status|update|seed|backup|import|logs> [homolog|prod]
set -euo pipefail
cmd="${1:?comando}"; env="${2:-homolog}"
root="$(cd "$(dirname "$0")/../.." && pwd)"
envfile="$root/infra/env/$env.env"; compose_file="$root/infra/compose/compose.yml"
dc() { docker compose -p "levelusp-$env" --env-file "$envfile" -f "$compose_file" --profile tunnel "$@"; }
secret() { head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40; }
setv() { if grep -q "^$1=" "$envfile"; then sed -i.bak "s#^$1=.*#$1=$2#" "$envfile" && rm -f "$envfile.bak"; else echo "$1=$2" >> "$envfile"; fi; }
getv() { grep "^$1=" "$envfile" | head -1 | cut -d= -f2-; }
tunnel_url() { for _ in $(seq 1 30); do u=$(dc logs tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true); [ -n "$u" ] && { echo "$u"; return; }; sleep 2; done; }
need_env() { [ -f "$envfile" ] || { echo "Rode primeiro: $0 setup $env" >&2; exit 1; }; }

case "$cmd" in
  setup)
    [ -f "$envfile" ] && { echo "$envfile já existe"; exit 0; }
    cp "$envfile.example" "$envfile"
    for k in POSTGRES_PASSWORD RUNNER_TOKEN SEED_ADMIN_PASSWORD; do setv "$k" "$(secret)"; done
    echo "Criado $envfile. Senha do admin ($(getv SEED_ADMIN_EMAIL)): $(getv SEED_ADMIN_PASSWORD)" ;;
  up)
    need_env; dc pull --quiet; dc up -d tunnel
    url="$(tunnel_url)"; [ -n "$url" ] && setv APP_ORIGIN "$url"
    dc up -d --remove-orphans
    echo "LevelUSP ($env): público $(getv APP_ORIGIN) · local http://localhost:$(getv WEB_PORT)" ;;
  down) need_env; dc down ;;
  status) need_env; dc ps; echo "Público: $(tunnel_url)"; curl -fsS "http://localhost:$(getv WEB_PORT)/api/health/ready" || true; echo ;;
  update) need_env; dc pull --quiet; dc up -d --remove-orphans ;;
  seed) need_env; dc --profile tools run --rm seed ;;
  import) need_env; : "${SOURCE_DATABASE_URL:?defina SOURCE_DATABASE_URL}"; dc --profile tools run --rm -e SOURCE_DATABASE_URL="$SOURCE_DATABASE_URL" import-supabase ;;
  backup)
    need_env; name="levelusp-$env-$(date +%Y%m%d-%H%M%S).sql.gz"
    dc exec -T postgres sh -c "pg_dump -U levelusp -d levelusp --no-owner | gzip > /backups/$name"
    echo "Backup: infra/compose/backups/$env/$name" ;;
  logs) need_env; dc logs -f --tail 200 ${3:-} ;;
  *) echo "Comando desconhecido: $cmd" >&2; exit 1 ;;
esac
