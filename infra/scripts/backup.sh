#!/usr/bin/env bash
# shellcheck source-path=SCRIPTDIR
# Backups do LevelUSP em produção (dados pessoais de alunos: LGPD).
#
#   backup.sh run [daily|manual] [rótulo]   pg_dump (formato custom) + volume de uploads,
#                                           criptografia opcional, rotação e cópia externa opcional
#   backup.sh list                          backups locais (mais recentes primeiro)
#   backup.sh verify [DIR]                  TESTE DE RESTAURAÇÃO: restaura o mais recente (ou DIR)
#                                           num banco descartável e confere com o manifesto
#   backup.sh restore DIR [--target-db NOME] [--no-uploads] [--yes]
#                                           restaura (por padrão no banco de produção, com troca
#                                           atômica e o banco anterior preservado)
#   backup.sh prune                         aplica a rotação (local e, se configurado, externa)
#
# Configuração: infra/env/vm.env (LEVELUSP_ENV_FILE para outro arquivo). Ver docs/v2/producao-vm.md.
# BACKUP_MODE=compose (padrão) usa os contêineres; BACKUP_MODE=direct usa pg_dump/psql do host
# com PGHOST/PGPORT/PGUSER/PGPASSWORD (bancos externos e o teste deste script).
set -euo pipefail
umask 077

LEVELUSP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib/vm-common.sh
source "$LEVELUSP_ROOT/infra/scripts/lib/vm-common.sh"

readonly BACKUP_KINDS=(daily weekly manual)
readonly BACKUP_NAME_REGEX='[0-9]{8}T[0-9]{6}Z(-[A-Za-z0-9._-]+)?'
readonly DB_NAME_REGEX='^[a-z_][a-z0-9_]{0,62}$'
# Tabelas conferidas no teste de restauração (contagens gravadas no manifesto).
readonly KEY_TABLES=(users profiles courses lessons enrollments lesson_progress submissions certificates exam_attempts uploads audit_log)

# Sem os NOTICEs de "DROP DATABASE IF EXISTS" no log do cron.
readonly PG_QUIET_OPTIONS="-c client_min_messages=warning"

WORK_DIR=""
GPG_HOME=""

cleanup() {
  [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]] && rm -rf -- "$WORK_DIR"
  [[ -n "$GPG_HOME" && -d "$GPG_HOME" ]] && rm -rf -- "$GPG_HOME"
  return 0
}
trap cleanup EXIT

init_settings() {
  load_env
  BACKUP_DIR="${BACKUP_DIR:-/var/backups/levelusp}"
  BACKUP_MODE="${BACKUP_MODE:-compose}"
  DB_NAME="${DB_NAME:-levelusp}"
  DB_USER="${DB_USER:-levelusp}"
  BACKUP_ENCRYPTION="${BACKUP_ENCRYPTION:-none}"
  RESTORE_TEST_DB="${RESTORE_TEST_DB:-levelusp_restore_test}"
  [[ "$DB_NAME" =~ $DB_NAME_REGEX ]] || die "DB_NAME inválido: $DB_NAME"
  [[ "$RESTORE_TEST_DB" =~ $DB_NAME_REGEX ]] || die "RESTORE_TEST_DB inválido: $RESTORE_TEST_DB"
  [[ "$RESTORE_TEST_DB" != "$DB_NAME" ]] || die "RESTORE_TEST_DB não pode ser o banco de produção"
  case "$BACKUP_MODE" in
    compose) require_command docker ;;
    direct)
      require_command pg_dump "Instale o cliente PostgreSQL (postgresql-client)."
      require_command pg_restore
      require_command psql
      local libpq_var
      for libpq_var in PGHOST PGPORT PGUSER PGPASSWORD PGSSLMODE; do
        [[ -n "${!libpq_var+x}" ]] && export "${libpq_var?}"
      done
      [[ -n "${UPLOADS_DIR:-}" ]] || warn "BACKUP_MODE=direct sem UPLOADS_DIR: os uploads não entram no backup"
      ;;
    *) die "BACKUP_MODE inválido: $BACKUP_MODE (use compose ou direct)" ;;
  esac
  case "$BACKUP_ENCRYPTION" in
    none) ;;
    age)
      require_command age "Instale com: sudo apt install age"
      [[ -n "${BACKUP_AGE_RECIPIENTS_FILE:-}" || -n "${BACKUP_AGE_RECIPIENT:-}" ]] \
        || die "BACKUP_ENCRYPTION=age exige BACKUP_AGE_RECIPIENT (chave pública age1…) ou BACKUP_AGE_RECIPIENTS_FILE"
      ;;
    gpg)
      require_command gpg
      [[ -r "${BACKUP_GPG_PASSPHRASE_FILE:-}" ]] || die "BACKUP_ENCRYPTION=gpg exige BACKUP_GPG_PASSPHRASE_FILE legível"
      ;;
    *) die "BACKUP_ENCRYPTION inválido: $BACKUP_ENCRYPTION (use none, age ou gpg)" ;;
  esac
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"
}

# ---------------------------------------------------------------- PostgreSQL

# Roda um programa do cliente PostgreSQL (stdin/stdout repassados).
pg_tool() {
  local tool="$1"
  shift
  if [[ "$BACKUP_MODE" == "compose" ]]; then
    dc exec -T -e PGUSER="$DB_USER" -e PGOPTIONS="$PG_QUIET_OPTIONS" postgres "$tool" "$@"
  else
    PGOPTIONS="$PG_QUIET_OPTIONS" "$tool" "$@"
  fi
}

psql_at() {
  local database="$1" sql="$2"
  pg_tool psql -X -q -v ON_ERROR_STOP=1 -At -d "$database" -c "$sql"
}

recreate_database() {
  local database="$1"
  [[ "$database" =~ $DB_NAME_REGEX ]] || die "nome de banco inválido: $database"
  psql_at postgres "DROP DATABASE IF EXISTS \"$database\" WITH (FORCE)" > /dev/null
  psql_at postgres "CREATE DATABASE \"$database\"" > /dev/null
}

drop_database() {
  psql_at postgres "DROP DATABASE IF EXISTS \"$1\" WITH (FORCE)" > /dev/null
}

# Contagens gravadas no manifesto e conferidas no teste de restauração.
database_stats() {
  local database="$1" sql table
  sql="select 'tables=' || count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'"
  sql+=" union all select 'migrations=' || count(*) from drizzle.__drizzle_migrations"
  for table in "${KEY_TABLES[@]}"; do
    sql+=" union all select 'rows.$table=' || count(*) from public.$table"
  done
  psql_at "$database" "$sql"
}

# ------------------------------------------------------------------ Uploads

uploads_archive() {
  if [[ "$BACKUP_MODE" == "compose" ]]; then
    dc run --rm --no-deps -T --entrypoint tar api -C /data/uploads -czf - .
  elif [[ -n "${UPLOADS_DIR:-}" ]]; then
    tar -C "$UPLOADS_DIR" -czf - .
  else
    tar -czf - --files-from /dev/null
  fi
}

uploads_extract() {
  if [[ "$BACKUP_MODE" == "compose" ]]; then
    dc run --rm --no-deps -T --entrypoint tar api -C /data/uploads -xzf -
  else
    [[ -n "${UPLOADS_DIR:-}" ]] || die "defina UPLOADS_DIR para restaurar os uploads"
    mkdir -p "$UPLOADS_DIR"
    tar -C "$UPLOADS_DIR" -xzf -
  fi
}

# ------------------------------------------------------------ Criptografia

encryption_suffix() {
  case "$BACKUP_ENCRYPTION" in
    age) printf '.age' ;;
    gpg) printf '.gpg' ;;
    *) printf '' ;;
  esac
}

gpg_home() {
  [[ -n "$GPG_HOME" ]] || GPG_HOME="$(mktemp -d)"
  printf '%s' "$GPG_HOME"
}

encrypt_file() {
  local source="$1" target="$2"
  case "$BACKUP_ENCRYPTION" in
    none) mv -- "$source" "$target" ;;
    age)
      if [[ -n "${BACKUP_AGE_RECIPIENTS_FILE:-}" ]]; then
        age --encrypt -R "$BACKUP_AGE_RECIPIENTS_FILE" -o "$target" "$source"
      else
        age --encrypt -r "$BACKUP_AGE_RECIPIENT" -o "$target" "$source"
      fi
      rm -f -- "$source"
      ;;
    gpg)
      gpg --homedir "$(gpg_home)" --batch --yes --quiet --pinentry-mode loopback \
        --passphrase-file "$BACKUP_GPG_PASSPHRASE_FILE" --symmetric --cipher-algo AES256 -o "$target" "$source"
      rm -f -- "$source"
      ;;
  esac
}

# Decifra pela extensão do arquivo (funciona mesmo se a configuração mudou depois).
decrypt_to_stdout() {
  local file="$1"
  case "$file" in
    *.age)
      [[ -r "${BACKUP_AGE_IDENTITY_FILE:-}" ]] \
        || die "$file está cifrado com age: defina BACKUP_AGE_IDENTITY_FILE (chave privada) para restaurar/testar"
      age --decrypt -i "$BACKUP_AGE_IDENTITY_FILE" "$file"
      ;;
    *.gpg)
      [[ -r "${BACKUP_GPG_PASSPHRASE_FILE:-}" ]] || die "$file está cifrado com gpg: defina BACKUP_GPG_PASSPHRASE_FILE"
      gpg --homedir "$(gpg_home)" --batch --quiet --pinentry-mode loopback \
        --passphrase-file "$BACKUP_GPG_PASSPHRASE_FILE" --decrypt "$file"
      ;;
    *) cat -- "$file" ;;
  esac
}

# ----------------------------------------------------------------- Apoio

acquire_lock() {
  exec {lock_fd}> "$BACKUP_DIR/.lock"
  flock -n "$lock_fd" || die "outro backup/restauração está em andamento"
}

backup_file() {
  local dir="$1" base="$2" candidate
  for candidate in "$dir/$base" "$dir/$base.age" "$dir/$base.gpg"; do
    [[ -f "$candidate" ]] && { printf '%s' "$candidate"; return 0; }
  done
  return 1
}

manifest_value() {
  local dir="$1" key="$2"
  awk -F= -v k="$key" '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$dir/manifest.txt"
}

verify_checksums() {
  local dir="$1"
  [[ -f "$dir/SHA256SUMS" ]] || die "$dir não tem SHA256SUMS (backup incompleto?)"
  (cd "$dir" && sha256sum --quiet --check SHA256SUMS) || die "checksum não confere em $dir: arquivo corrompido ou alterado"
}

latest_backup() {
  local kind
  for kind in "${BACKUP_KINDS[@]}"; do
    [[ -d "$BACKUP_DIR/$kind" ]] || continue
    find "$BACKUP_DIR/$kind" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended -regex ".*/$BACKUP_NAME_REGEX" -printf '%f %p\n'
  done | sort -r | head -n 1 | cut -d' ' -f2-
}

resolve_backup_dir() {
  local requested="${1:-}"
  if [[ -z "$requested" ]]; then
    requested="$(latest_backup)"
    [[ -n "$requested" ]] || die "nenhum backup em $BACKUP_DIR"
  fi
  [[ -d "$requested" ]] || die "diretório de backup não encontrado: $requested"
  (cd "$requested" && pwd)
}

# ------------------------------------------------------------------ Rotação

prune_kind() {
  local kind="$1" keep="$2" name
  [[ -d "$BACKUP_DIR/$kind" ]] || return 0
  find "$BACKUP_DIR/$kind" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended -regex ".*/$BACKUP_NAME_REGEX" -printf '%f\n' \
    | sort -r | tail -n "+$((keep + 1))" | while IFS= read -r name; do
      log "Rotação: removendo $kind/$name"
      rm -rf -- "${BACKUP_DIR:?}/$kind/$name"
    done
}

prune_offsite() {
  [[ -n "${BACKUP_RCLONE_REMOTE:-}" && -n "${BACKUP_RCLONE_MAX_AGE:-}" ]] || return 0
  require_command rclone
  log "Rotação externa: removendo arquivos com mais de $BACKUP_RCLONE_MAX_AGE em $BACKUP_RCLONE_REMOTE"
  rclone delete --min-age "$BACKUP_RCLONE_MAX_AGE" "$BACKUP_RCLONE_REMOTE"
  rclone rmdirs --leave-root "$BACKUP_RCLONE_REMOTE"
}

cmd_prune() {
  prune_kind daily "${BACKUP_KEEP_DAILY:-7}"
  prune_kind weekly "${BACKUP_KEEP_WEEKLY:-4}"
  prune_kind manual "${BACKUP_KEEP_MANUAL:-10}"
  prune_offsite
}

# ---------------------------------------------------------- Cópia externa

offsite_copy() {
  local dir="$1" relative="$2"
  [[ -n "${BACKUP_RCLONE_REMOTE:-}" || -n "${BACKUP_OFFSITE_HOOK:-}" ]] || return 0
  if [[ "$BACKUP_ENCRYPTION" == "none" && "${BACKUP_OFFSITE_ALLOW_PLAINTEXT:-false}" != "true" ]]; then
    die "cópia externa recusada: backup sem criptografia contém dados pessoais (LGPD). Configure BACKUP_ENCRYPTION=age|gpg."
  fi
  if [[ -n "${BACKUP_RCLONE_REMOTE:-}" ]]; then
    require_command rclone "Instale com: sudo apt install rclone"
    log "Cópia externa: rclone → $BACKUP_RCLONE_REMOTE/$relative"
    rclone copy --immutable "$dir" "$BACKUP_RCLONE_REMOTE/$relative"
  fi
  if [[ -n "${BACKUP_OFFSITE_HOOK:-}" ]]; then
    [[ -x "$BACKUP_OFFSITE_HOOK" ]] || die "BACKUP_OFFSITE_HOOK não é executável: $BACKUP_OFFSITE_HOOK"
    log "Cópia externa: $BACKUP_OFFSITE_HOOK"
    "$BACKUP_OFFSITE_HOOK" "$dir" "$relative"
  fi
}

# ----------------------------------------------------------------- Backup

write_manifest() {
  local work="$1" kind="$2" uploads_files="$3"
  {
    printf 'created_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'kind=%s\n' "$kind"
    printf 'app_env=%s\n' "${APP_ENV:-prod}"
    printf 'image_tag=%s\n' "${IMAGE_TAG:-desconhecida}"
    printf 'database=%s\n' "$DB_NAME"
    printf 'format=pg_dump-custom\n'
    printf 'encryption=%s\n' "$BACKUP_ENCRYPTION"
    printf 'uploads_files=%s\n' "$uploads_files"
    database_stats "$DB_NAME"
  } > "$work/manifest.txt"
}

on_run_exit() {
  local status="$1"
  if [[ "$status" -eq 0 ]]; then
    ping_monitor "${BACKUP_PING_URL:-}" ok
  else
    ping_monitor "${BACKUP_PING_URL:-}" fail
    notify "backup FALHOU (código $status). Veja o log do backup na VM."
  fi
  cleanup
}

cmd_run() {
  local kind="${1:-daily}" label="${2:-}" stamp name work suffix uploads_files target file
  [[ "$kind" == "daily" || "$kind" == "manual" ]] || die "tipo de backup inválido: $kind (use daily ou manual)"
  [[ -z "$label" || "$label" =~ ^[A-Za-z0-9._-]{1,40}$ ]] || die "rótulo inválido: $label"
  acquire_lock
  trap 'on_run_exit $?' EXIT
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  name="$stamp${label:+-$label}"
  target="$BACKUP_DIR/$kind/$name"
  mkdir -p "$BACKUP_DIR/$kind"
  WORK_DIR="$(mktemp -d "$BACKUP_DIR/.tmp.XXXXXX")"
  work="$WORK_DIR"
  mkdir "$work/out"

  log "Backup $kind/$name: dump do banco $DB_NAME (pg_dump, formato custom)"
  pg_tool pg_dump --format=custom --no-owner --no-privileges -d "$DB_NAME" > "$work/db.dump"
  pg_tool pg_restore --list < "$work/db.dump" > /dev/null || die "o dump gerado não é legível pelo pg_restore"

  log "Backup $kind/$name: volume de uploads"
  uploads_archive > "$work/uploads.tar.gz"
  uploads_files="$(tar -tzf "$work/uploads.tar.gz" | grep -cv '/$' || true)"

  write_manifest "$work" "$kind" "$uploads_files"
  suffix="$(encryption_suffix)"
  encrypt_file "$work/db.dump" "$work/out/db.dump$suffix"
  encrypt_file "$work/uploads.tar.gz" "$work/out/uploads.tar.gz$suffix"
  mv -- "$work/manifest.txt" "$work/out/manifest.txt"
  (cd "$work/out" && sha256sum -- * > SHA256SUMS)
  mv -- "$work/out" "$target"
  log "Backup salvo em $target ($(du -sh "$target" | cut -f1), criptografia: $BACKUP_ENCRYPTION)"

  if [[ "$kind" == "daily" && "$(date +%u)" == "${BACKUP_WEEKLY_DAY:-7}" ]]; then
    mkdir -p "$BACKUP_DIR/weekly"
    cp -al -- "$target" "$BACKUP_DIR/weekly/$name" 2> /dev/null || cp -a -- "$target" "$BACKUP_DIR/weekly/$name"
    log "Cópia semanal: weekly/$name"
    offsite_copy "$BACKUP_DIR/weekly/$name" "weekly/$name"
  fi
  offsite_copy "$target" "$kind/$name"
  cmd_prune
  for file in "$target"/*; do chmod 600 "$file"; done
}

cmd_list() {
  local kind
  for kind in "${BACKUP_KINDS[@]}"; do
    [[ -d "$BACKUP_DIR/$kind" ]] || continue
    find "$BACKUP_DIR/$kind" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended -regex ".*/$BACKUP_NAME_REGEX" -printf '%f\n' \
      | sort -r | while IFS= read -r name; do
        printf '%-8s %-40s %s\n' "$kind" "$name" "$(du -sh "$BACKUP_DIR/$kind/$name" | cut -f1)"
      done
  done
}

# ------------------------------------------------------ Restauração

restore_database_from() {
  local dir="$1" database="$2" dump
  dump="$(backup_file "$dir" db.dump)" || die "$dir não tem db.dump"
  recreate_database "$database"
  decrypt_to_stdout "$dump" | pg_tool pg_restore --no-owner --no-privileges --exit-on-error -d "$database"
}

# Compara o banco restaurado com o manifesto. Diferença em contagens de linhas é só
# aviso (o manifesto é lido segundos depois do dump); estrutura diferente é falha.
check_restored_database() {
  local dir="$1" database="$2" stats line key restored expected failures=0
  stats="$(database_stats "$database")" || { log "FALHA: não consegui consultar o banco restaurado"; return 1; }
  while IFS= read -r line; do
    key="${line%%=*}"
    restored="${line#*=}"
    expected="$(manifest_value "$dir" "$key")"
    if [[ -z "$expected" ]]; then
      warn "$key não está no manifesto"
    elif [[ "$key" == "tables" || "$key" == "migrations" ]]; then
      if [[ "$restored" != "$expected" ]]; then
        log "FALHA: $key restaurado=$restored esperado=$expected"
        failures=$((failures + 1))
      fi
    elif [[ "$restored" != "$expected" ]]; then
      warn "$key: restaurado=$restored, manifesto=$expected (escritas durante o dump?)"
    fi
    log "  $key=$restored"
  done <<< "$stats"
  if [[ "$(manifest_value "$dir" rows.users)" != "0" && "$(psql_at "$database" 'select count(*) from public.users')" == "0" ]]; then
    log "FALHA: tabela users vazia após a restauração"
    failures=$((failures + 1))
  fi
  return "$failures"
}

check_uploads_archive() {
  local dir="$1" archive restored expected
  archive="$(backup_file "$dir" uploads.tar.gz)" || { warn "$dir não tem uploads.tar.gz"; return 0; }
  restored="$(decrypt_to_stdout "$archive" | tar -tzf - | grep -cv '/$' || true)"
  expected="$(manifest_value "$dir" uploads_files)"
  log "  uploads_files=$restored (manifesto: $expected)"
  [[ "$restored" == "$expected" ]]
}

cmd_verify() {
  local dir started outcome="FALHOU" status=0
  dir="$(resolve_backup_dir "${1:-}")"
  acquire_lock
  started="$(date +%s)"
  log "Teste de restauração: $dir → banco descartável $RESTORE_TEST_DB"
  verify_checksums "$dir"
  if restore_database_from "$dir" "$RESTORE_TEST_DB" && check_restored_database "$dir" "$RESTORE_TEST_DB" && check_uploads_archive "$dir"; then
    outcome="OK"
  else
    status=1
  fi
  drop_database "$RESTORE_TEST_DB"
  printf '%s %s %s (%ss)\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$outcome" "$dir" "$(($(date +%s) - started))" >> "$BACKUP_DIR/restore-test.log"
  log "Teste de restauração: $outcome ($(($(date +%s) - started)) s). Histórico em $BACKUP_DIR/restore-test.log"
  if [[ "$status" -ne 0 ]]; then
    notify "teste de restauração FALHOU para $dir"
    ping_monitor "${RESTORE_TEST_PING_URL:-}" fail
    return "$status"
  fi
  ping_monitor "${RESTORE_TEST_PING_URL:-}" ok
}

# Falha antes da troca: o banco de produção não foi alterado; religa api e web.
on_restore_exit() {
  local status="$1"
  if [[ "$status" -ne 0 ]]; then
    warn "restauração interrompida (código $status); religando api e web com o banco anterior"
    dc up -d api web || warn "não consegui religar: rode levelusp-vm.sh deploy"
  fi
  cleanup
}

confirm_production_restore() {
  local answer
  [[ -t 0 ]] || die "restauração em produção exige confirmação interativa (ou --yes)"
  printf 'Isto SUBSTITUI o banco "%s" pelo backup. O banco atual será guardado com outro nome.\n' "$DB_NAME"
  read -r -p "Digite o nome do banco para confirmar: " answer
  [[ "$answer" == "$DB_NAME" ]] || die "cancelado"
}

# Troca por renomeação: o banco atual nunca é apagado pelo script.
swap_in_restored_database() {
  local restored="$1" previous="$2"
  if [[ "$(psql_at postgres "select count(*) from pg_database where datname = '$DB_NAME'")" == "1" ]]; then
    psql_at postgres "select pg_terminate_backend(pid) from pg_stat_activity where datname = '$DB_NAME' and pid <> pg_backend_pid()" > /dev/null
    psql_at postgres "ALTER DATABASE \"$DB_NAME\" RENAME TO \"$previous\"" > /dev/null
    log "Banco anterior guardado como $previous"
  fi
  psql_at postgres "ALTER DATABASE \"$restored\" RENAME TO \"$DB_NAME\"" > /dev/null
}

cmd_restore() {
  local source="" target="" with_uploads=true assume_yes=false dir previous staging
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --target-db) target="${2:?--target-db precisa de um nome}"; shift 2 ;;
      --no-uploads) with_uploads=false; shift ;;
      --yes) assume_yes=true; shift ;;
      -*) die "opção desconhecida: $1" ;;
      *) source="$1"; shift ;;
    esac
  done
  [[ -n "$source" ]] || die "uso: backup.sh restore DIR_DO_BACKUP [--target-db NOME] [--no-uploads] [--yes]"
  dir="$(resolve_backup_dir "$source")"
  verify_checksums "$dir"
  target="${target:-$DB_NAME}"
  [[ "$target" =~ $DB_NAME_REGEX ]] || die "nome de banco inválido: $target"
  acquire_lock

  if [[ "$target" != "$DB_NAME" ]]; then
    log "Restaurando $dir no banco $target"
    restore_database_from "$dir" "$target"
    check_restored_database "$dir" "$target" || warn "o banco restaurado difere do manifesto (veja acima)"
    log "Pronto: banco $target restaurado (uploads não são tocados com --target-db)."
    return 0
  fi

  [[ "$assume_yes" == "true" ]] || confirm_production_restore
  staging="${DB_NAME}_restaurando"
  previous="${DB_NAME}_antes_$(date -u +%Y%m%d%H%M%S)"
  if [[ "$BACKUP_MODE" == "compose" ]]; then
    log "Parando api e web (o túnel/proxy mostra erro 502 durante a restauração)"
    trap 'on_restore_exit $?' EXIT
    dc stop api web
  fi
  log "Restaurando em $staging"
  restore_database_from "$dir" "$staging"
  check_restored_database "$dir" "$staging" || warn "o banco restaurado difere do manifesto (veja acima)"
  swap_in_restored_database "$staging" "$previous"
  log "Banco trocado: $DB_NAME agora contém o backup"
  if [[ "$with_uploads" == "true" ]]; then
    log "Restaurando uploads"
    decrypt_to_stdout "$(backup_file "$dir" uploads.tar.gz)" | uploads_extract
  fi
  if [[ "$BACKUP_MODE" == "compose" ]]; then
    dc up -d
  fi
  log "Restauração concluída. Confira o sistema e depois apague o banco antigo (dados pessoais):"
  log "  infra/scripts/levelusp-vm.sh psql -c 'DROP DATABASE \"$previous\"'"
}

main() {
  local command="${1:-}"
  [[ $# -gt 0 ]] && shift
  case "$command" in
    run | list | verify | restore | prune) ;;
    *) die "uso: backup.sh {run [daily|manual] [rótulo] | list | verify [DIR] | restore DIR [--target-db NOME] [--no-uploads] [--yes] | prune}" ;;
  esac
  init_settings
  "cmd_$command" "$@"
}

main "$@"
