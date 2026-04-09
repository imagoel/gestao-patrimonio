FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json .npmrc ./
RUN npm ci

FROM base AS dev

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM base AS build

COPY . .
RUN npm run build

FROM build AS ops

CMD ["node", "scripts/bootstrap-db.mjs"]

FROM build AS runtime-deps

RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS prod

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=runtime-deps /app/package*.json ./
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=runtime-deps /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
