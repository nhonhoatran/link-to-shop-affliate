# Build from the repo root: docker build -f apps/api/Dockerfile .
# Debian slim (glibc) because sharp and argon2 ship prebuilt glibc binaries.
FROM node:24-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm CI=true
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @under30ss/api...

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @under30ss/shared run build && pnpm --filter @under30ss/api run build
RUN pnpm install --frozen-lockfile --prod --filter @under30ss/api...

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=4000
WORKDIR /repo
COPY --from=builder --chown=node:node /repo/node_modules ./node_modules
COPY --from=builder --chown=node:node /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=node:node /repo/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=node:node /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder --chown=node:node /repo/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /repo/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /repo/apps/api/node_modules ./apps/api/node_modules
USER node
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/server.js"]
