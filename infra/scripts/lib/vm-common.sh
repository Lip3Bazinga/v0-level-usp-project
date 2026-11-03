# shellcheck shell=bash
# Funções comuns dos scripts de produção na VM (levelusp-vm.sh e backup.sh).
# Quem importa define LEVELUSP_ROOT (raiz do repositório) antes do `source`.

: "${LEVELUSP_ROOT:?defina LEVELUSP_ROOT antes de importar vm-common.sh}"
LEVELUSP_ENV_FILE="${LEVELUSP_ENV_FILE:-$LEVELUSP_ROOT/infra/env/vm.env}"
COMPOSE_DIR="$LEVELUSP_ROOT/infra/compose"

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
warn() { log "AVISO: $*" >&2; }
die() { log "ERRO: $*" >&2; exit 1; }

# Lê o arquivo de ambiente como DADOS (KEY=VALOR), sem executá-lo como shell:
# um valor com $(...) ou crase não roda nada. Variáveis já definidas no ambiente
# do processo têm precedência (permite sobrescrever pontualmente: IMAGE_TAG=... cmd).
load_env() {
  [[ -f "$LEVELUSP_ENV_FILE" ]] || die "Arquivo $LEVELUSP_ENV_FILE não existe. Rode: infra/scripts/levelusp-vm.sh setup"
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    if [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]]; then value="${BASH_REMATCH[1]}"; fi
    [[ -n "${!key+x}" ]] && continue
    printf -v "$key" '%s' "$value"
  done < "$LEVELUSP_ENV_FILE"
  check_env_permissions
}

# O arquivo tem senhas e o token do túnel: só o dono pode ler.
check_env_permissions() {
  local mode
  mode="$(stat -c '%a' "$LEVELUSP_ENV_FILE" 2>/dev/null || echo 600)"
  if [[ "${mode: -1}" != "0" || "${mode: -2:1}" != "0" ]]; then
    warn "$LEVELUSP_ENV_FILE tem permissão $mode; corrija com: chmod 600 $LEVELUSP_ENV_FILE"
  fi
}

# Grava (ou acrescenta) KEY=VALOR no arquivo de ambiente, preservando o resto.
set_env_value() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp "$LEVELUSP_ENV_FILE.XXXXXX")"
  if grep -q "^$key=" "$LEVELUSP_ENV_FILE"; then
    awk -v k="$key" -v v="$value" 'index($0, k "=") == 1 { print k "=" v; next } { print }' "$LEVELUSP_ENV_FILE" > "$tmp"
  else
    cat "$LEVELUSP_ENV_FILE" > "$tmp"
    printf '%s=%s\n' "$key" "$value" >> "$tmp"
  fi
  chmod 600 "$tmp"
  mv "$tmp" "$LEVELUSP_ENV_FILE"
  printf -v "$key" '%s' "$value"
}

# Perfis de entrada pública: cloudflare (túnel nomeado), caddy (HTTPS próprio) ou none.
ingress_profile_args() {
  case "${INGRESS:-cloudflare}" in
    cloudflare) printf '%s\n' --profile cloudflare ;;
    caddy) printf '%s\n' --profile caddy ;;
    none) ;;
    *) die "INGRESS inválido: '${INGRESS}'. Use cloudflare, caddy ou none." ;;
  esac
}

dc() {
  local -a profile_args
  mapfile -t profile_args < <(ingress_profile_args)
  docker compose \
    --project-name "${COMPOSE_PROJECT_NAME:-levelusp-prod}" \
    --env-file "$LEVELUSP_ENV_FILE" \
    -f "$COMPOSE_DIR/compose.yml" \
    -f "$COMPOSE_DIR/compose.vm.yml" \
    "${profile_args[@]}" \
    "$@"
}

require_command() {
  command -v "$1" > /dev/null 2>&1 || die "Comando '$1' não encontrado. ${2:-}"
}

# Notificação opcional (ntfy.sh, Healthchecks.io, webhook genérico): corpo em texto puro.
notify() {
  local message="$1"
  [[ -n "${ALERT_WEBHOOK_URL:-}" ]] || return 0
  curl -fsS --max-time 10 -H 'Content-Type: text/plain; charset=utf-8' --data-binary "LevelUSP (${APP_ENV:-prod}): $message" "$ALERT_WEBHOOK_URL" > /dev/null \
    || warn "não consegui enviar o alerta para ALERT_WEBHOOK_URL"
}

# "Dead man's switch" (ex.: Healthchecks.io): sucesso pinga a URL; falha pinga URL/fail.
ping_monitor() {
  local url="$1" outcome="$2"
  [[ -n "$url" ]] || return 0
  [[ "$outcome" == "fail" ]] && url="${url%/}/fail"
  curl -fsS --max-time 10 --retry 2 "$url" > /dev/null || warn "não consegui avisar o monitor externo ($outcome)"
}
