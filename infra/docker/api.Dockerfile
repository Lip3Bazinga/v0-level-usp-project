# syntax=docker/dockerfile:1.7
# API NestJS + jobs de banco (migrate/seed/import) na mesma imagem.
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
COPY packages/db/package.json packages/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @levelusp/api...
COPY packages/contracts packages/contracts
COPY packages/db packages/db
COPY apps/api apps/api
RUN pnpm --filter @levelusp/contracts build \
 && pnpm --filter @levelusp/db build \
 && pnpm --filter @levelusp/api build \
 && pnpm --filter @levelusp/api deploy --legacy --prod /out \
 && rm -rf /out/src /out/test /out/scripts

FROM node:22-bookworm-slim AS runtime
ARG APP_VERSION=dev
ENV NODE_ENV=production APP_VERSION=${APP_VERSION} PORT=4000 UPLOAD_DIR=/data/uploads
RUN apt-get update && apt-get install -y --no-install-recommends tini ca-certificates && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /data/uploads && chown -R node:node /data
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]
# Jobs: docker compose run --rm migrate  → node node_modules/@levelusp/db/dist/scripts/migrate.js
