FROM node:22-alpine AS base
ARG PNPM_VERSION="10.14.0"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV npm_config_fetch_retries="5"
ENV npm_config_fetch_retry_mintimeout="10000"
ENV npm_config_fetch_retry_maxtimeout="60000"
RUN set -eu; \
  corepack enable; \
  attempt=1; \
  until corepack prepare "pnpm@${PNPM_VERSION}" --activate; do \
    if [ "${attempt}" -ge 5 ]; then \
      echo "No se pudo descargar pnpm después de ${attempt} intentos."; \
      exit 1; \
    fi; \
    wait_seconds=$((attempt * 5)); \
    echo "Descarga de pnpm fallida; reintentando en ${wait_seconds}s."; \
    sleep "${wait_seconds}"; \
    attempt=$((attempt + 1)); \
  done

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=brandforge-pnpm-store,target=/pnpm/store,sharing=locked \
  pnpm install --frozen-lockfile --fetch-retries=5

FROM base AS builder
WORKDIR /app
ENV DATABASE_URL="file:/tmp/brandforge-build.db"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm db:generate && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"
ENV NEXT_TELEMETRY_DISABLED="1"
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node scripts/ensure-sqlite.mjs && ./node_modules/.bin/prisma migrate deploy && exec node server.js"]
