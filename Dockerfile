# Dockerfile for Finspark Intelligence (Backend)
# Demonstrates production-readiness for enterprise deployment
FROM node:18-alpine

# Install build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

# Create app directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm ci --omit=dev

# Bundle app source
COPY server/ ./server/

# Expose the standard backend port
EXPOSE 3001

# Run the API server
CMD ["node", "server/index.js"]
