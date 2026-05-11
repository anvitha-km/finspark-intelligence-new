# Dockerfile for Finspark Intelligence (Backend)
# Demonstrates production-readiness for enterprise deployment
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install dependencies (production only to keep image lean)
RUN cd server && npm ci --only=production

# Bundle app source
COPY server/ ./server/

# Expose the standard backend port
EXPOSE 3001

# Run the API server
CMD ["node", "server/index.js"]
