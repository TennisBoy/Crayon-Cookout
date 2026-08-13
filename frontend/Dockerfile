# Crayon Cookout SPA
#
# Two stages: build the bundle, then serve the static output. Multi-arch —
# nothing here is architecture-specific, so it builds on Oracle's arm64 tier.
#
# Served by `serve`, not Nginx or Caddy: Cloudflare Tunnel terminates TLS and
# routes to these ports directly, so a reverse proxy in the image would be a
# third layer doing nothing. `serve -s` gives the SPA history fallback, which
# is the one thing a static server must get right for client-side routing.

# --- build ------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Vite inlines VITE_* variables at BUILD time, not run time. The API URL has
# to be known here — see docs/deployment.md before changing it.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- serve ------------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN npm install -g serve@14.2.4

COPY --from=build /app/dist ./dist

# node:alpine ships a `node` user (uid 1000); reuse it rather than inventing one.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# -s: rewrite unknown paths to index.html so /library and /register work on a
#     hard refresh. Without it every deep link 404s.
CMD ["serve", "-s", "dist", "-l", "3000"]
