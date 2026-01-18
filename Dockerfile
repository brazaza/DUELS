FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb* ./
COPY packages ./packages
COPY apps/server ./apps/server

RUN cd apps/server && bun install

ENV PORT=3001
EXPOSE 3001

CMD ["bun", "apps/server/src/index.ts"]
