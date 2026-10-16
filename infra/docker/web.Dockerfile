# syntax=docker/dockerfile:1.7
# Front Next.js (saída standalone).
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @levelusp/web...
COPY packages/contracts packages/contracts
COPY apps/web apps/web
# Rewrites do Next são resolvidos no build: a API é o serviço "api" da rede do compose.
ARG API_INTERNAL_URL=http://api:4000
ARG NEXT_PUBLIC_PYODIDE_INDEX_URL=https://cdn.jsdelivr.net/pyodide/v0.25.1/full/
ARG NEXT_PUBLIC_APP_ENV=prod
ENV API_INTERNAL_URL=${API_INTERNAL_URL} NEXT_PUBLIC_PYODIDE_INDEX_URL=${NEXT_PUBLIC_PYODIDE_INDEX_URL} NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV}
RUN pnpm --filter @levelusp/contracts build && pnpm --filter @levelusp/web build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "apps/web/server.js"]
