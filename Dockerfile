# syntax=docker/dockerfile:1

##### 1. deps: install dependencies only #####
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

##### 2. builder: build the Next.js app #####
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ingen env kreves her — OPENAI_API_KEY leses først ved request-tid, ikke
# under bygget.
# next-pwa skriver sw.js og workbox-*.js til public/ under bygget, så public/
# må kopieres etter at dette steget er ferdig.
RUN npm run build

##### 3. runner: minimal runtime image #####
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
