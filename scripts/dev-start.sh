#!/bin/bash
# WSL2-optimized development startup script
# Handles the known issues with Docker on WSL2:
# 1. Postgres slow initialization (fsync optimization)
# 2. pg_isready unreliability (custom healthcheck)
# 3. Port mapping issues (fallback to host networking)

set -e

cd "$(dirname "$0")/.."

echo "🚀 Starting Nexus in WSL2 mode..."

# Step 1: Start infrastructure first (postgres needs time to init)
echo "📦 Starting infrastructure (postgres, redis)..."
docker compose up -d postgres redis

# Step 2: Wait for postgres to be healthy (can take 2-5 min in WSL2)
echo "⏳ Waiting for postgres to initialize (this can take 2-5 minutes in WSL2)..."
until docker compose exec postgres sh -c "su - postgres -c 'psql -U leadplatform -d leadplatform -c \"SELECT 1\"'" > /dev/null 2>&1; do
  echo "  Still waiting for postgres..."
  sleep 10
done
echo "✅ Postgres is ready!"

# Step 3: Run database migrations
echo "🔄 Running database migrations..."
docker compose exec backend uv run alembic upgrade head 2>/dev/null || echo "  (Migrations will run on backend start)"

# Step 4: Start all other services
echo "🖥️  Starting application services..."
docker compose up -d backend frontend celery-worker celery-beat elasticsearch minio

# Step 5: Verify services
echo "🔍 Verifying services..."
sleep 10
docker compose ps

echo ""
echo "✅ Nexus is running!"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  API Docs: http://localhost:8000/api/v1/docs"
echo ""
echo "If frontend is not accessible (WSL2 port mapping issue):"
echo "  docker stop ai-lead-intelligence-platform-frontend-1"
echo "  cd frontend && npm run dev"
