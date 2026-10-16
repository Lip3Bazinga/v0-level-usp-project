# syntax=docker/dockerfile:1.7
# Executor isolado: Node (orquestração) + Wasmtime + CPython 3.14 WASI.
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends curl ca-certificates xz-utils unzip && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY apps/runner/package.json apps/runner/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @levelusp/runner...
COPY packages/contracts packages/contracts
COPY apps/runner apps/runner
# Baixa Wasmtime + CPython WASI com verificação de SHA-256 e pré-compila o módulo.
RUN PYTHON_WASI_DIR=/opt/levelusp-python WASMTIME_INSTALL_DIR=/usr/local/bin bash apps/runner/scripts/fetch-python-wasi.sh
RUN pnpm --filter @levelusp/contracts build \
 && pnpm --filter @levelusp/runner build \
 && pnpm --filter @levelusp/runner deploy --legacy --prod /out \
 && rm -rf /out/src /out/test

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8081 PYTHON_WASI_DIR=/opt/levelusp-python WORK_DIR=/tmp/jobs
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/local/bin/wasmtime /usr/local/bin/wasmtime
COPY --from=build /opt/levelusp-python /opt/levelusp-python
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8081/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "mkdir -p $WORK_DIR && exec node dist/main.js"]
