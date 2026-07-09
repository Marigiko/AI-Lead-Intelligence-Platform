.PHONY: help dev up down restart build logs db-migrate db-upgrade test lint format

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Development ──────────────────────────────────────────────

dev: ## Start all services in development mode
	docker compose up -d
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@echo "API Docs: http://localhost:8000/api/v1/docs"
	@echo "MinIO Console: http://localhost:9001"

up: ## Start services in background
	docker compose up -d

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

build: ## Build all Docker images
	docker compose build --no-cache

logs: ## Tail logs from all services
	docker compose logs -f

logs-backend: ## Tail backend logs
	docker compose logs -f backend

# ── Database ─────────────────────────────────────────────────

db-migrate: ## Generate a new Alembic migration
	docker compose exec backend uv run alembic revision --autogenerate -m "$(msg)"

db-upgrade: ## Apply pending migrations
	docker compose exec backend uv run alembic upgrade head

db-downgrade: ## Rollback last migration
	docker compose exec backend uv run alembic downgrade -1

db-reset: ## Drop and recreate database (DESTRUCTIVE)
	docker compose exec backend uv run alembic downgrade base
	docker compose exec backend uv run alembic upgrade head

# ── Backend ──────────────────────────────────────────────────

backend-shell: ## Open Python shell in backend
	docker compose exec backend uv run python

backend-install: ## Install new dependency (usage: make backend-install pkg=package-name)
	docker compose exec backend uv add $(pkg)

backend-test: ## Run backend tests
	docker compose exec backend uv run pytest

# ── Frontend ─────────────────────────────────────────────────

frontend-install: ## Install new dependency (usage: make frontend-install pkg=package-name)
	cd frontend && npm install $(pkg)

frontend-dev: ## Start frontend dev server standalone
	cd frontend && npm run dev

# ── Code Quality ─────────────────────────────────────────────

lint: ## Run linter
	cd backend && uv run ruff check src tests

format: ## Format code
	cd backend && uv run ruff format src tests

typecheck: ## Run type checker
	cd backend && uv run pyright

test: ## Run all tests
	cd backend && uv run pytest -v

test-cov: ## Run tests with coverage
	cd backend && uv run pytest --cov=src --cov-report=html

# ── Playwright ───────────────────────────────────────────────

playwright-install: ## Install Playwright browsers
	docker compose exec backend uv run playwright install chromium --with-deps

# ── Production ───────────────────────────────────────────────

prod-up: ## Start production stack
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-build: ## Build production images
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build
