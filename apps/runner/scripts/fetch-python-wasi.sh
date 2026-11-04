#!/usr/bin/env bash
# Baixa e verifica o Wasmtime e o CPython WASI usados pelo executor.
# Uso: PYTHON_WASI_DIR=/opt/levelusp-python bash scripts/fetch-python-wasi.sh
set -euo pipefail

WASMTIME_VERSION="${WASMTIME_VERSION:-49.0.5}"
PYTHON_WASI_VERSION="${PYTHON_WASI_VERSION:-3.14.0}"
PYTHON_WASI_SDK="${PYTHON_WASI_SDK:-24}"
DEST="${PYTHON_WASI_DIR:-/opt/levelusp-python}"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) WT_ARCH="x86_64" ;;
  aarch64|arm64) WT_ARCH="aarch64" ;;
  *) echo "Arquitetura não suportada: $ARCH" >&2; exit 1 ;;
esac

# Hashes conferidos em 2026-10-15. Atualize junto com as versões.
PYTHON_ZIP_SHA256="54aa3e33ebb45e03b5c13b86ce8742b45bb94e394925622fa66c4700f6782979"
WASMTIME_X86_SHA256="101b181779afec556ac2cc6639a7ee3661de20c17f7948e0b290f63e9da9bdce"
WASMTIME_ARM_SHA256="55fa95b10e07167cc681593c06928199ac19306e2226e23652c62ac9e278c201"

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
mkdir -p "$DEST"

if ! command -v wasmtime >/dev/null 2>&1 || ! wasmtime --version | grep -q "$WASMTIME_VERSION"; then
  url="https://github.com/bytecodealliance/wasmtime/releases/download/v${WASMTIME_VERSION}/wasmtime-v${WASMTIME_VERSION}-${WT_ARCH}-linux.tar.xz"
  curl -fsSL "$url" -o "$tmp/wt.tar.xz"
  if [ "$WT_ARCH" = "x86_64" ]; then expected="$WASMTIME_X86_SHA256"; else expected="$WASMTIME_ARM_SHA256"; fi
  echo "$expected  $tmp/wt.tar.xz" | sha256sum -c -
  tar -xf "$tmp/wt.tar.xz" -C "$tmp"
  install -m 0755 "$tmp/wasmtime-v${WASMTIME_VERSION}-${WT_ARCH}-linux/wasmtime" "${WASMTIME_INSTALL_DIR:-/usr/local/bin}/wasmtime"
fi

url="https://github.com/brettcannon/cpython-wasi-build/releases/download/v${PYTHON_WASI_VERSION}/python-${PYTHON_WASI_VERSION}-wasi_sdk-${PYTHON_WASI_SDK}.zip"
curl -fsSL "$url" -o "$tmp/py.zip"
echo "$PYTHON_ZIP_SHA256  $tmp/py.zip" | sha256sum -c -
unzip -q -o "$tmp/py.zip" -d "$DEST"

# Pré-compila para carregar em ~20 ms. As flags precisam bater com as do executor.
# --target explícito: sem ele o Wasmtime compila para a CPU da máquina que roda este script
# (no GitHub, com AVX-512) e o .cwasm é recusado em qualquer CPU sem essas instruções
# ("compilation settings ... not supported by host"). Com o alvo genérico, só o conjunto
# base da arquitetura entra, e a mesma imagem roda em qualquer notebook ou VM.
wasmtime compile --target "${WT_ARCH}-unknown-linux-gnu" -W fuel=1,epoch-interruption=y "$DEST/python.wasm" -o "$DEST/python.cwasm"
echo "Python WASI pronto em $DEST"
