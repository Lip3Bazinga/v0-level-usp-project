# syntax=docker/dockerfile:1.7
# Executor isolado: Node (orquestração) + Wasmtime + CPython 3.14 WASI (motor python) +
# Pyodide (CPython 3.14 em wasm com numpy/pandas/scikit-learn, motor python-dados).
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
# Versão do Pyodide: muda só com a atualização; isola a camada do download abaixo.
ARG PYODIDE_VERSION=314.0.7
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends curl ca-certificates xz-utils unzip bzip2 && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY apps/runner/package.json apps/runner/
COPY packages/contracts/package.json packages/contracts/
# Só o package.json: dependência de desenvolvimento (lint) que o pnpm precisa achar no workspace.
COPY packages/eslint-config/package.json packages/eslint-config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @levelusp/runner...
# Só o script de download: a camada do Pyodide (337 MB baixados, 62 MB extraídos) é cacheada
# pela versão e não refaz quando muda só o código do runner.
COPY apps/runner/scripts/fetch-pyodide.sh apps/runner/scripts/
RUN --mount=type=cache,id=pyodide-tarball,target=/tarball-cache \
    PYODIDE_VERSION=${PYODIDE_VERSION} PYODIDE_DIR=/opt/levelusp-pyodide PYODIDE_TARBALL_CACHE=/tarball-cache \
    bash apps/runner/scripts/fetch-pyodide.sh
COPY packages/contracts packages/contracts
COPY apps/runner apps/runner
# Baixa Wasmtime + CPython WASI com verificação de SHA-256 e pré-compila o módulo.
RUN PYTHON_WASI_DIR=/opt/levelusp-python WASMTIME_INSTALL_DIR=/usr/local/bin bash apps/runner/scripts/fetch-python-wasi.sh
RUN pnpm --filter @levelusp/contracts build \
 && pnpm --filter @levelusp/runner build \
 && pnpm --filter @levelusp/runner deploy --legacy --prod /out \
 && rm -rf /out/src /out/test

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8081 PYTHON_WASI_DIR=/opt/levelusp-python PYODIDE_DIR=/opt/levelusp-pyodide WORK_DIR=/tmp/jobs
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/local/bin/wasmtime /usr/local/bin/wasmtime
COPY --from=build /opt/levelusp-python /opt/levelusp-python
COPY --from=build /opt/levelusp-pyodide /opt/levelusp-pyodide
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8081/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "mkdir -p $WORK_DIR && exec node dist/main.js"]
