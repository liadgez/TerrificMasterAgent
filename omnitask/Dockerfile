# OmniTask Dockerfile
# Note: This provides web automation only - desktop automation requires macOS

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Playwright to use installed Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S omnitask -u 1001

# Copy built application
COPY --from=builder --chown=omnitask:nodejs /app/.next ./.next
COPY --from=builder --chown=omnitask:nodejs /app/public ./public
COPY --from=builder --chown=omnitask:nodejs /app/package.json ./package.json

# Copy production dependencies
COPY --from=deps --chown=omnitask:nodejs /app/node_modules ./node_modules

# Copy necessary runtime files
COPY --chown=omnitask:nodejs next.config.ts ./
COPY --chown=omnitask:nodejs src/lib ./src/lib
COPY --chown=omnitask:nodejs src/types ./src/types
COPY --chown=omnitask:nodejs scripts/setup-permissions.js ./scripts/
COPY --chown=omnitask:nodejs scripts/verify-installation.js ./scripts/

# Create data directories
RUN mkdir -p /app/data /app/logs /app/cache \
    && chown -R omnitask:nodejs /app/data /app/logs /app/cache

# Switch to non-root user
USER omnitask

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start command
CMD ["npm", "start"]

# Metadata
LABEL maintainer="Liad Gez <liad@example.com>"
LABEL description="OmniTask - AI-powered automation for web and desktop"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/liadgez/TerrificMasterAgent"
LABEL org.opencontainers.image.description="Local-first AI agent for web and desktop automation"
LABEL org.opencontainers.image.licenses="MIT"