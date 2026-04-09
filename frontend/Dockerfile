FROM node:22-bookworm-slim AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM base AS dev

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]

FROM base AS build

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS prod

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
