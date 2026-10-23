# ==============================================================
# AICTE ICMS — Production Dockerfile (Unified Deployable Container)
# Builds React frontend and serves via FastAPI on a single port
# Suitable for Render, Railway, Fly.io, AWS EC2, or Azure App Service
# ==============================================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Runtime
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code, scripts, and documentation
COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY README.md ./

# Copy built frontend assets from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create uploads directory and ensure non-root permissions
RUN mkdir -p /app/uploads && useradd -m -u 1001 aicte && chown -R aicte:aicte /app

USER aicte

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start server using uvicorn
CMD ["sh", "-c", "python -m scripts.seed_demo_data && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
