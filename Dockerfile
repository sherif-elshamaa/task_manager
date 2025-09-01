# Multi-stage build for production optimization
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production --silent && npm cache clean --force

# Build stage
FROM base AS build
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build
# Copy runtime health-check util into dist for Docker HEALTHCHECK
COPY src/health-check.js dist/health-check.js

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs package*.json ./

USER nestjs

EXPOSE 3000

# Health check with improved configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node dist/health-check.js || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
