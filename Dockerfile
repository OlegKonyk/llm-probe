# Dockerfile for LLM Testing Framework Backend
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY backend ./backend

# Build TypeScript
RUN npm run build --workspace=backend

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --workspace=backend --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/backend/dist ./backend/dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "backend/dist/index.js"]
