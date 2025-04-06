FROM node:20-slim

# Install system dependencies and Ollama
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://ollama.com/install.sh | sh && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy root package files for workspace configuration
COPY package*.json ./

# Copy backend package files
COPY backend/package*.json ./backend/

# Install ALL dependencies (including devDependencies for build)
# Use npm ci with workspace flag to install backend dependencies
RUN npm ci --workspace backend

# Copy backend source
COPY backend/ ./

# Build TypeScript to dist/
RUN npm run build

# Remove devDependencies to slim down production image
RUN npm prune --production

# Expose Hugging Face Spaces default port
ENV PORT=7860
EXPOSE 7860

# Set environment variables
ENV NODE_ENV=production
ENV OLLAMA_HOST=http://localhost:11434
ENV OLLAMA_MODEL=llama3.2:latest
ENV LOG_LEVEL=info

# Download Ollama model at build time (cached in image)
RUN ollama serve & \
    sleep 10 && \
    ollama pull llama3.2:latest && \
    pkill ollama

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Security: Run as non-root user
# Best Practice: Containers should not run as root to minimize security risks
RUN chown -R node:node /app
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

# Start application
CMD ["/app/start.sh"]
