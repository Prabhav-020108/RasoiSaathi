FROM node:22-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="file:./rasoisaathi.db"
RUN npx prisma generate
# Compile seed.ts into standalone CommonJS prisma-dist so runner needs no tsx/typescript
RUN npx tsc --esModuleInterop --resolveJsonModule --module commonjs --target es2020 --skipLibCheck --outDir prisma-dist prisma/seed.ts
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache openssl wget && mkdir -p /app/data
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/rasoisaathi.db"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma-dist ./prisma-dist
COPY --from=builder /app/seed-data ./seed-data
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
