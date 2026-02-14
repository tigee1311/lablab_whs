# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Install production deps for backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

# Copy built backend
COPY --from=backend-build /app/backend/dist ./dist

# Copy built frontend into backend's static serving
COPY --from=frontend-build /app/frontend/dist ./public

# Create data directory
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/opstwin.db
ENV CORS_ORIGIN=*

EXPOSE 3001

CMD ["node", "dist/server.js"]
