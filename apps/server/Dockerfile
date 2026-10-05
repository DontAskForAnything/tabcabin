# syntax=docker/dockerfile:1
# Build from the repository root:  docker build -f apps/server/Dockerfile -t tabhangar-server .

FROM node:24-slim AS build
WORKDIR /repo
RUN npm install -g pnpm@12.10.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @tabcabin/server...
COPY packages/core packages/core
COPY apps/server apps/server
RUN pnpm --filter @tabcabin/server build

FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DATA_DIR=/data
WORKDIR /app
# The bundle has everything except the native SQLite driver.
COPY --from=build /repo/apps/server/package.json /tmp/server-package.json
RUN npm install --omit=dev --no-save --no-package-lock \
      "better-sqlite3@$(node -p "require('/tmp/server-package.json').dependencies['better-sqlite3']")" \
    && npm cache clean --force \
    && rm /tmp/server-package.json \
    # Keep only the prebuilt driver for this platform (glibc Linux, this architecture).
    && cd node_modules/better-sqlite3 \
    && rm -rf deps src binding.gyp \
    && find prebuilds -type f ! -name "linux-$(node -p process.arch).node" -delete \
    && cd /app \
    && printf '#!/bin/sh\nexec node /app/dist/cli.js "$@"\n' > /usr/local/bin/tabhangar \
    && chmod +x /usr/local/bin/tabhangar \
    && mkdir -p /data && chown node:node /data
COPY --from=build /repo/apps/server/dist ./dist
USER node
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]
