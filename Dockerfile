FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile

EXPOSE 8080

CMD ["pnpm", "--filter", "@duels/server", "start"]
