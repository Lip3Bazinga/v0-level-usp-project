#!/usr/bin/env bash
# shellcheck source-path=SCRIPTDIR
# Operação do LevelUSP em produção numa VM Linux (Docker Compose + compose.vm.yml).
# O fluxo do notebook (levelusp.ps1 / levelusp.sh + Quick Tunnel) continua separado.
#
# Uso: infra/scripts/levelusp-vm.sh <comando> [argumentos]
#   setup                     cria infra/env/vm.env a partir do modelo, com senhas aleatórias
#   check                     valida a configuração (variáveis, compose, ferramentas)
#   deploy [TAG]              backup pré-deploy, baixa as imagens, migra e sobe (TAG: prod | sha-xxxxxxx)
#   rollback SHA              volta para as imagens sha-<7 primeiros caracteres do commit>
#   status                    contêineres, versão, saúde, último backup e último teste de restauração
#   logs [SERVIÇO]            acompanha os logs (api, web, runner, postgres, cloudflared, caddy, migrate)
#   backup [daily|manual] [RÓTULO]   backup agora (ver backup.sh)
#   restore DIR [opções]      restaura um backup (ver backup.sh restore)
#   restore-test [DIR]        teste de restauração num banco descartável
#   health-check              checagem para o cron: registra em LOG_DIR/health.log e alerta após falhas seguidas
#   mail-test EMAIL           envia um e-mail de teste com a configuração SMTP da API
#   seed                      cria o admin inicial (primeiro deploy)
#   import                    importa os dados do Supabase (pede SOURCE_DATABASE_URL)
#   psql [ARGS]               psql no banco de produção (ex.: psql -c 'select count(*) from users')
#   install-cron              instala /etc/cron.d/levelusp e /etc/logrotate.d/levelusp (root)
#   down                      para tudo (os volumes com os dados ficam)
set -euo pipefail

LEVELUSP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib/vm-common.sh
source "$LEVELUSP_ROOT/infra/scripts/lib/vm-common.sh"

readonly SCRIPT_PATH="$LEVELUSP_ROOT/infra/scripts/levelusp-vm.sh"
readonly BACKUP_SCRIPT="$LEVELUSP_ROOT/infra/scripts/backup.sh"
readonly HEALTH_TIMEOUT_SECONDS=10
readonly DEPLOY_WAIT_SECONDS=300
readonly SHA_TAG_LENGTH=7

state_dir() {
  local dir="${STATE_DIR:-$LEVELUSP_ROOT/infra/env/.state}"
  mkdir -p "$dir"
  chmod 700 "$dir"
  printf '%s' "$dir"
}

secret() { head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40; }

cmd_setup() {
  local example="$LEVELUSP_ROOT/infra/env/vm.env.example" key
  if [[ -f "$LEVELUSP_ENV_FILE" ]]; then
    log "$LEVELUSP_ENV_FILE já existe — mantido."
    return 0
  fi
  (umask 077 && cp "$example" "$LEVELUSP_ENV_FILE")
  for key in POSTGRES_PASSWORD RUNNER_TOKEN SEED_ADMIN_PASSWORD; do set_env_value "$key" "$(secret)"; done
  log "Criado $LEVELUSP_ENV_FILE (chmod 600) com senhas aleatórias."
  log "Agora edite os campos __preencher__ (PUBLIC_BASE_URL, MAIL_FROM, SEED_ADMIN_EMAIL), INGRESS e o token/domínio,"
  log "depois rode: $SCRIPT_PATH check"
}

# ------------------------------------------------------------------ check

check_required() {
  local key="$1" hint="$2" value
  value="${!key:-}"
  if [[ -z "$value" || "$value" == *__preencher__* || "$value" == *__gerar__* ]]; then
    log "  [falta] $key — $hint"
    return 1
  fi
}

check_ingress() {
  case "${INGRESS:-cloudflare}" in
    cloudflare) check_required CLOUDFLARE_TUNNEL_TOKEN "token do túnel nomeado (painel Zero Trust)" ;;
    caddy)
      check_required PUBLIC_DOMAIN "domínio para o certificado HTTPS" || return 1
      check_required ACME_EMAIL "e-mail para o Let's Encrypt" || return 1
      [[ "$PUBLIC_BASE_URL" == "https://$PUBLIC_DOMAIN" ]] || { log "  [erro] PUBLIC_BASE_URL deve ser https://$PUBLIC_DOMAIN"; return 1; }
      ;;
    none) warn "INGRESS=none: o site só responde em 127.0.0.1:${WEB_PORT:-3000} (proxy externo por sua conta)" ;;
    *) log "  [erro] INGRESS deve ser cloudflare, caddy ou none"; return 1 ;;
  esac
}

cmd_check() {
  local problems=0
  require_command docker "Instale o Docker Engine (docs/v2/producao-vm.md, passo 2)."
  docker compose version > /dev/null 2>&1 || die "Plugin 'docker compose' ausente (pacote docker-compose-plugin)."
  require_command curl
  log "Conferindo $LEVELUSP_ENV_FILE"
  check_required PUBLIC_BASE_URL "ex.: https://levelusp.exemplo.usp.br" || problems=$((problems + 1))
  [[ "${PUBLIC_BASE_URL:-}" =~ ^https://[^/]+$ ]] || { log "  [erro] PUBLIC_BASE_URL precisa ser https://dominio (sem caminho nem barra final)"; problems=$((problems + 1)); }
  check_required MAIL_FROM "remetente dos e-mails" || problems=$((problems + 1))
  check_required POSTGRES_PASSWORD "rode setup" || problems=$((problems + 1))
  check_required RUNNER_TOKEN "rode setup" || problems=$((problems + 1))
  check_ingress || problems=$((problems + 1))
  [[ -n "${SMTP_URL:-}" ]] || warn "SMTP_URL vazio: links de senha/convite só no log da API (não abra para alunos assim)"
  [[ "${BACKUP_ENCRYPTION:-none}" != "none" ]] || warn "BACKUP_ENCRYPTION=none: backups com dados pessoais sem criptografia"
  dc config --quiet || problems=$((problems + 1))
  if [[ "$problems" -gt 0 ]]; then
    die "$problems problema(s) na configuração"
  fi
  log "Configuração OK (INGRESS=${INGRESS:-cloudflare}, IMAGE_TAG=${IMAGE_TAG:-prod})."
}

# ----------------------------------------------------------------- deploy

database_has_data() {
  dc ps --status running --services 2> /dev/null | grep -qx postgres || return 1
  [[ "$(dc exec -T postgres psql -U levelusp -d levelusp -Atc "select to_regclass('public.users') is not null" 2> /dev/null)" == "t" ]]
}

record_deploy() {
  local tag="$1" outcome="$2"
  printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$tag" "$outcome" >> "$(state_dir)/deploy-history.log"
}

wait_until_healthy() {
  local deadline=$((SECONDS + DEPLOY_WAIT_SECONDS))
  until curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "http://127.0.0.1:${WEB_PORT:-3000}/api/health/ready" 2> /dev/null | grep -q '"status":"ok"'; do
    ((SECONDS < deadline)) || return 1
    sleep 5
  done
}

cmd_deploy() {
  local tag="${1:-${IMAGE_TAG:-prod}}" previous="${IMAGE_TAG:-prod}"
  [[ "$tag" =~ ^(prod|homolog|sha-[0-9a-f]{7,40})$ ]] || die "tag inválida: $tag (use prod, homolog ou sha-<commit>)"
  cmd_check
  if database_has_data; then
    log "Backup pré-deploy (manual/…-pre-$tag)"
    "$BACKUP_SCRIPT" run manual "pre-$tag"
  fi
  [[ "$tag" == "$previous" ]] || set_env_value IMAGE_TAG "$tag"
  log "Baixando imagens ($tag)"
  if ! dc pull --quiet; then
    [[ "$tag" == "$previous" ]] || set_env_value IMAGE_TAG "$previous"
    die "não consegui baixar as imagens $tag (a tag existe no GHCR? docker login ghcr.io feito?)"
  fi
  log "Subindo (o serviço migrate roda as migrações antes da API)"
  if ! dc up -d --remove-orphans || ! wait_until_healthy; then
    record_deploy "$tag" falhou
    dc ps
    die "deploy de $tag não ficou saudável. Veja: $SCRIPT_PATH logs api | Para voltar: $SCRIPT_PATH deploy $previous"
  fi
  record_deploy "$tag" ok
  log "Deploy de $tag concluído. Público: ${PUBLIC_BASE_URL:-?}"
}

cmd_rollback() {
  local sha="${1:-}"
  sha="${sha#sha-}"
  [[ "$sha" =~ ^[0-9a-fA-F]{7,40}$ ]] || die "uso: rollback <sha do commit> (ex.: rollback 3666998)"
  sha="$(printf '%s' "${sha:0:$SHA_TAG_LENGTH}" | tr '[:upper:]' '[:lower:]')"
  warn "Se a versão atual aplicou migrações novas, o código antigo pode não entender o banco."
  warn "Nesse caso restaure também o backup pré-deploy: $SCRIPT_PATH restore ${BACKUP_DIR:-/var/backups/levelusp}/manual/<…-pre-…>"
  cmd_deploy "sha-$sha"
}

# ----------------------------------------------------------------- status

image_revision() {
  local service="$1" id
  id="$(dc ps -q "$service" 2> /dev/null | head -n 1)"
  [[ -n "$id" ]] || { printf 'parado'; return 0; }
  docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}} ({{.Config.Image}})' "$id" 2> /dev/null || printf '?'
}

cmd_status() {
  local service last_backup
  dc ps
  printf '\nVersões em execução:\n'
  for service in api web runner; do printf '  %-7s %s\n' "$service" "$(image_revision "$service")"; done
  printf '\nSaúde local: '
  curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "http://127.0.0.1:${WEB_PORT:-3000}/api/health/ready" || printf 'INDISPONÍVEL'
  printf '\nSaúde pública (%s): ' "${PUBLIC_BASE_URL:-?}"
  curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "${PUBLIC_BASE_URL:-http://invalido}/api/health/ready" || printf 'INDISPONÍVEL'
  printf '\n\n'
  last_backup="$(find "${BACKUP_DIR:-/var/backups/levelusp}" -mindepth 2 -maxdepth 2 -type d -name '2*' -printf '%f\n' 2> /dev/null | sort | tail -n 1)"
  printf 'Último backup:            %s\n' "${last_backup:-nenhum}"
  printf 'Último teste restauração: %s\n' "$(tail -n 1 "${BACKUP_DIR:-/var/backups/levelusp}/restore-test.log" 2> /dev/null || echo nenhum)"
  printf 'Últimos deploys:\n'
  tail -n 3 "$(state_dir)/deploy-history.log" 2> /dev/null || echo "  nenhum"
  printf 'Disco (backups):          %s livres\n' "$(df -h --output=avail "${BACKUP_DIR:-/var/backups/levelusp}" 2> /dev/null | tail -n 1 | tr -d ' ' || echo '?')"
}

# ----------------------------------------------------------- health-check

# Para o cron: uma linha por execução em LOG_DIR/health.log; alerta depois de N falhas seguidas
# e avisa quando volta. Saída 0/1 para quem quiser encadear.
cmd_health_check() {
  local log_dir="${LOG_DIR:-/var/log/levelusp}" state failures=0 local_status public_status="-" ok=true
  local threshold="${HEALTHCHECK_FAILURES_BEFORE_ALERT:-2}"
  mkdir -p "$log_dir"
  state="$(state_dir)/health-failures"
  [[ -f "$state" ]] && failures="$(cat "$state")"
  if curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "http://127.0.0.1:${WEB_PORT:-3000}/api/health/ready" 2> /dev/null | grep -q '"status":"ok"'; then
    local_status=ok
  else
    local_status=FALHA
    ok=false
  fi
  if [[ "${HEALTHCHECK_PUBLIC:-true}" == "true" && -n "${PUBLIC_BASE_URL:-}" ]]; then
    if curl -fsS --max-time "$HEALTH_TIMEOUT_SECONDS" "$PUBLIC_BASE_URL/api/health/live" > /dev/null 2>&1; then
      public_status=ok
    else
      public_status=FALHA
      ok=false
    fi
  fi
  printf '%s local=%s publico=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$local_status" "$public_status" >> "$log_dir/health.log"
  if [[ "$ok" == "true" ]]; then
    [[ "$failures" -ge "$threshold" ]] && notify "voltou ao ar (local=$local_status, público=$public_status)"
    echo 0 > "$state"
    ping_monitor "${HEALTHCHECK_PING_URL:-}" ok
    return 0
  fi
  failures=$((failures + 1))
  echo "$failures" > "$state"
  [[ "$failures" -eq "$threshold" ]] && notify "FORA DO AR há $failures checagens (local=$local_status, público=$public_status). Rode: levelusp-vm.sh status"
  ping_monitor "${HEALTHCHECK_PING_URL:-}" fail
  return 1
}

# --------------------------------------------------------------- outros

cmd_logs() {
  if [[ $# -gt 0 ]]; then dc logs -f --tail 200 "$1"; else dc logs -f --tail 100; fi
}

cmd_mail_test() {
  local recipient="${1:-}"
  [[ "$recipient" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || die "uso: mail-test destino@exemplo.com"
  dc exec -T api node dist/cli/mail-test.js "$recipient"
}

cmd_import() {
  if [[ -z "${SOURCE_DATABASE_URL:-}" ]]; then
    read -r -s -p "Connection string do Supabase (Settings > Database > Session): " SOURCE_DATABASE_URL
    echo
  fi
  dc --profile tools run --rm -e SOURCE_DATABASE_URL="$SOURCE_DATABASE_URL" import-supabase
}

# Interativo no terminal; com entrada/saída redirecionadas (ex.: "> arquivo.csv"), sem TTY
# para não misturar \r na saída.
cmd_psql() {
  if [[ -t 0 && -t 1 ]]; then
    dc exec postgres psql -U levelusp -d levelusp "$@"
  else
    dc exec -T postgres psql -U levelusp -d levelusp "$@"
  fi
}

cmd_install_cron() {
  local log_dir="${LOG_DIR:-/var/log/levelusp}"
  [[ "$(id -u)" -eq 0 ]] || die "rode como root: sudo $SCRIPT_PATH install-cron"
  mkdir -p "$log_dir"
  chmod 750 "$log_dir"
  # Horários fora do pico e fora do minuto 0 (concorrência com outros jobs da VM).
  cat > /etc/cron.d/levelusp << EOF
# LevelUSP (gerado por levelusp-vm.sh install-cron). Horário do sistema da VM.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LEVELUSP_ENV_FILE=$LEVELUSP_ENV_FILE
*/5 * * * * root $SCRIPT_PATH health-check > /dev/null 2>> $log_dir/health.log
17 3 * * * root $BACKUP_SCRIPT run daily >> $log_dir/backup.log 2>&1
41 4 * * 0 root $BACKUP_SCRIPT verify >> $log_dir/verify.log 2>&1
EOF
  chmod 644 /etc/cron.d/levelusp
  cat > /etc/logrotate.d/levelusp << EOF
$log_dir/*.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
    create 0640 root adm
}
EOF
  log "Instalados /etc/cron.d/levelusp (health-check 5/5 min, backup 03:17, teste de restauração dom 04:41)"
  log "e /etc/logrotate.d/levelusp (8 semanas de logs em $log_dir)."
}

main() {
  local command="${1:-}"
  [[ $# -gt 0 ]] && shift
  case "$command" in
    setup) cmd_setup ;;
    check) load_env && cmd_check ;;
    deploy) load_env && cmd_deploy "$@" ;;
    rollback) load_env && cmd_rollback "$@" ;;
    status) load_env && cmd_status ;;
    logs) load_env && cmd_logs "$@" ;;
    backup) exec "$BACKUP_SCRIPT" run "$@" ;;
    restore) exec "$BACKUP_SCRIPT" restore "$@" ;;
    restore-test) exec "$BACKUP_SCRIPT" verify "$@" ;;
    health-check) load_env && cmd_health_check ;;
    mail-test) load_env && cmd_mail_test "$@" ;;
    seed) load_env && dc --profile tools run --rm seed ;;
    import) load_env && cmd_import ;;
    psql) load_env && cmd_psql "$@" ;;
    install-cron) load_env && cmd_install_cron ;;
    down) load_env && dc down ;;
    *) sed -n '3,25p' "$SCRIPT_PATH" | sed 's/^# \{0,1\}//'; [[ -z "$command" ]] || die "comando desconhecido: $command" ;;
  esac
}

main "$@"
