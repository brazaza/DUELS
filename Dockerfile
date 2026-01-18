FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb* ./
COPY packages ./packages
COPY apps ./apps

RUN bun install

ENV PORT=3001
EXPOSE 3001

CMD ["bun", "run", "--cwd", "apps/server", "start"]
