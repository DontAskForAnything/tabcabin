# syntax=docker/dockerfile:1
# The website as a container, served by Caddy on port 80 (the host's proxy adds HTTPS).
# Build from the repository root:
#   docker build -f apps/landing/Dockerfile --build-arg SITE_URL=https://example.com -t tabcabin-site .
# EXTENSION_URL, REPO_URL, UMAMI_SCRIPT_URL and UMAMI_WEBSITE_ID are build arguments too (see
# docs/landing.md).

FROM node:24-slim AS build
WORKDIR /repo
RUN npm install -g pnpm@12.10.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ui/package.json packages/ui/
COPY apps/landing/package.json apps/landing/
RUN pnpm install --frozen-lockfile --filter @tabcabin/landing...
COPY packages/ui packages/ui
COPY docs/screenshots docs/screenshots
COPY apps/landing apps/landing
ARG SITE_URL EXTENSION_URL REPO_URL UMAMI_SCRIPT_URL UMAMI_WEBSITE_ID
RUN pnpm --filter @tabcabin/landing build

FROM caddy:2-alpine
COPY apps/landing/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/landing/dist /srv
EXPOSE 80
