#!/usr/bin/env bash
# Baixa o Pyodide (CPython 3.14 em wasm com numpy, pandas, scikit-learn...) usado pelo
# motor python-dados do executor. Baixa o tarball oficial do GitHub para um cache, confere
# o SHA-256, extrai o núcleo e só o fechamento de dependências dos pacotes da lista para
# PYODIDE_DIR. Idempotente: já tendo o núcleo e os pacotes certos em PYODIDE_DIR, não refaz.
#   PYODIDE_DIR=/opt/levelusp-pyodide bash scripts/fetch-pyodide.sh
set -euo pipefail

PYODIDE_VERSION="${PYODIDE_VERSION:-314.0.7}"
DEST="${PYODIDE_DIR:-/opt/levelusp-pyodide}"
CACHE="${PYODIDE_TARBALL_CACHE:-/tmp}"
# Pacotes de topo que o motor oferece; o fechamento de dependências é resolvido pelo lock.
PACKAGES="${PYODIDE_PACKAGES:-numpy pandas scipy scikit-learn matplotlib statsmodels sympy networkx micropip}"
# Conferido em 2026-11-04. Atualize junto com PYODIDE_VERSION.
TARBALL_SHA256="${PYODIDE_TARBALL_SHA256:-192b5864e6e6d30ab074861af800cb8b4acb0998ef0f9342c3367448aeb86645}"

tarball="${CACHE}/pyodide-${PYODIDE_VERSION}.tar.bz2"
url="https://github.com/pyodide/pyodide/releases/download/${PYODIDE_VERSION}/pyodide-${PYODIDE_VERSION}.tar.bz2"

# Núcleo mínimo do runtime (sem os wheels, que entram pelo fechamento de dependências).
CORE_FILES="pyodide.asm.js pyodide.asm.mjs pyodide.asm.wasm pyodide.mjs pyodide.js python_stdlib.zip pyodide-lock.json package.json pyodide.d.ts ffi.d.ts"

log() { echo "[fetch-pyodide] $*" >&2; }

marker="${DEST}/.levelusp-version"
wanted_marker="${PYODIDE_VERSION} ${PACKAGES}"
if [ -f "${DEST}/pyodide.asm.wasm" ] && [ -f "${marker}" ] && [ "$(cat "${marker}")" = "${wanted_marker}" ]; then
  log "já instalado em ${DEST} (${wanted_marker})"
  exit 0
fi

mkdir -p "${DEST}" "${CACHE}"

verify_sha() {
  if [ -z "${TARBALL_SHA256}" ]; then
    log "AVISO: sem SHA-256 esperado; pulando verificação"
    return 0
  fi
  echo "${TARBALL_SHA256}  ${tarball}" | sha256sum -c - >/dev/null
}

if [ ! -f "${tarball}" ] || ! verify_sha; then
  log "baixando ${url}"
  curl -fL --retry 3 "${url}" -o "${tarball}.part"
  mv "${tarball}.part" "${tarball}"
  verify_sha
fi
log "SHA-256 conferido"

work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT
tar -xjf "${tarball}" -C "${work}"
src="${work}/pyodide"
[ -d "${src}" ] || { log "ERRO: o tarball não tem a pasta pyodide/"; exit 1; }

# Resolve o fechamento de dependências dos pacotes pedidos a partir do pyodide-lock.json.
resolve_closure() {
  if command -v python3 >/dev/null 2>&1; then
    PYODIDE_LOCK="${src}/pyodide-lock.json" PYODIDE_WANTED="${PACKAGES}" python3 -I - <<'PY'
import json, os, sys
lock = json.load(open(os.environ["PYODIDE_LOCK"]))
packages = lock["packages"]
by_norm = {name.lower().replace("_", "-"): name for name in packages}
wanted, seen, files = list(os.environ["PYODIDE_WANTED"].split()), set(), []
stack = [w.lower().replace("_", "-") for w in wanted]
while stack:
    norm = stack.pop()
    key = by_norm.get(norm)
    if key is None or key in seen:
        continue
    seen.add(key)
    entry = packages[key]
    files.append(entry["file_name"])
    stack.extend(dependency.lower().replace("_", "-") for dependency in entry.get("depends", []))
print("\n".join(sorted(set(files))))
PY
  else
    PYODIDE_LOCK="${src}/pyodide-lock.json" PYODIDE_WANTED="${PACKAGES}" node -e '
const fs = require("node:fs")
const lock = JSON.parse(fs.readFileSync(process.env.PYODIDE_LOCK, "utf8"))
const packages = lock.packages
const norm = (name) => name.toLowerCase().replace(/[_.]+/g, "-")
const byNorm = new Map(Object.keys(packages).map((name) => [norm(name), name]))
const files = new Set()
const seen = new Set()
const stack = process.env.PYODIDE_WANTED.split(/\s+/).filter(Boolean).map(norm)
while (stack.length) {
  const key = byNorm.get(stack.pop())
  if (!key || seen.has(key)) continue
  seen.add(key)
  const entry = packages[key]
  files.add(entry.file_name)
  for (const dependency of entry.depends ?? []) stack.push(norm(dependency))
}
process.stdout.write([...files].sort().join("\n") + "\n")
'
  fi
}

closure="$(resolve_closure)"
[ -n "${closure}" ] || { log "ERRO: nenhum pacote resolvido (lista: ${PACKAGES})"; exit 1; }

# Limpa só os wheels antigos (mantém um cache de camada por versão intacto no tarball).
find "${DEST}" -maxdepth 1 -name '*.whl' -delete 2>/dev/null || true

for core in ${CORE_FILES}; do
  [ -f "${src}/${core}" ] && cp -f "${src}/${core}" "${DEST}/"
done
count=0
while IFS= read -r wheel; do
  [ -z "${wheel}" ] && continue
  if [ -f "${src}/${wheel}" ]; then
    cp -f "${src}/${wheel}" "${DEST}/"
    count=$((count + 1))
  else
    log "AVISO: wheel ausente no tarball: ${wheel}"
  fi
done <<< "${closure}"

echo "${wanted_marker}" > "${marker}"
size="$(du -sh "${DEST}" | cut -f1)"
log "pronto em ${DEST}: núcleo + ${count} wheels (${size})"
