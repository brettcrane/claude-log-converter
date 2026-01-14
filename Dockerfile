# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first (better layer caching)
COPY frontend/package*.json ./
RUN npm ci

# Build frontend
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/static ./static

# Copy application
COPY app/ app/
COPY run.py .

# Create non-root user for security
RUN useradd -m -u 1000 appuser \
    && mkdir -p /data/db \
    && chown -R appuser:appuser /app /data
USER appuser

EXPOSE 8000

# Use exec form for proper signal handling
CMD ["python", "-u", "run.py"]
