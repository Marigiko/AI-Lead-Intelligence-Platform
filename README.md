# Nexus — Autonomous Revenue Intelligence Platform

> AI-powered B2B sales pipeline that discovers companies, enriches data, scores opportunities, and acts as an autonomous revenue agent — wrapped in a premium, dark-mode SaaS experience.

Nexus combines an AI Revenue Agent (natural language conversational interface), real-time WebSocket chat, drag-and-drop Kanban pipeline, and an interactive lead map into a unified platform with a glassmorphism-first design system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Frontend | Next.js 14 (App Router), React, TypeScript (strict), Tailwind CSS, Radix UI |
| Design System | Custom glassmorphism system — electric purple + cyan, glow effects, mesh gradients |
| Database | PostgreSQL 16 + pgvector, Redis 7, Elasticsearch 8 |
| Task Queue | Celery + Redis (multi-queue: default, scraping, enrichment, ai, outreach) |
| AI | OpenAI-compatible gateway (configurable `OPENAI_API_BASE`), RAG, MCP Server |
| Real-time | WebSocket (conversation chat, live agent responses) |
| Charts | Recharts (area, bar, pie) |
| Maps | Leaflet + react-leaflet |
| Scraping | Playwright, BeautifulSoup, plugin architecture |
| Monitoring | Prometheus metrics, structured logging (structlog) |
| Container | Docker, Docker Compose (dev + prod) |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-desktop/) & Docker Compose
- [uv](https://docs.astral.sh/uv/) (for local backend development)
- [Node.js](https://nodejs.org/) >= 20 (for local frontend development)
- An **OpenAI API key** (or Anthropic/Google AI) for AI features

### Step 1 — Clone and Configure

```bash
git clone https://github.com/Marigiko/AI-Lead-Intelligence-Platform.git
cd AI-Lead-Intelligence-Platform
```

Create the environment file:

```bash
cp backend/.env.example backend/.env
```

If `.env.example` doesn't exist, create `backend/.env` with at minimum:

```env
# ── Required ──────────────────────────────
ENVIRONMENT=development
OPENAI_API_KEY=sk-your-key-here

# ── Generated secrets (change in production!) ──
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)

# ── Auto-configured by docker-compose ──
# DATABASE_URL and REDIS_URL are set automatically when using `make dev`
# Override only if running services externally.
```

Generate secure secret keys if you're setting up production:

```bash
openssl rand -hex 32   # → SECRET_KEY
openssl rand -hex 32   # → JWT_SECRET_KEY
```

### Step 2 — Start Infrastructure Services

```bash
make dev
```

This launches all containers via Docker Compose:

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:8002 | FastAPI + business logic |
| API Docs (Swagger) | http://localhost:8002/docs | Interactive API docs |
| API Docs (ReDoc) | http://localhost:8002/redoc | Alternative docs |
| Frontend | http://localhost:3000 | Next.js dashboard |
| PostgreSQL | localhost:5435 | Primary database (pgvector) |
| Redis | localhost:6382 | Cache + Celery broker |
| Elasticsearch | http://localhost:9200 | Search engine (optional) |
| MinIO Console | http://localhost:9011 | Object storage (admin:minioadmin) |
| Celery Worker | — | Background task processing |
| Celery Beat | — | Scheduled tasks (every 5 min) |

Verify all services are healthy:

```bash
make logs
# or for a single service:
docker compose logs backend
```

### Step 3 — Initialize the Database

Create the database schema:

```bash
make db-upgrade
```

> **Note:** The first run uses `Base.metadata.create_all` if no Alembic migrations exist. Once migrations are generated, use `make db-migrate msg="description"` for schema changes.

Seed sample data:

```bash
docker compose exec backend uv run python -m data.seeds.seed_companies
```

### Step 4 — Create an Admin User

Once the backend is running, register the first user via the API:

```bash
curl -X POST http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "demo1234",
    "full_name": "Admin User"
  }'
```

Or use the registration form in the frontend at http://localhost:3000/register.

### Step 5 — Run Celery Workers (if not using Docker)

If you're running the backend locally without Docker, start the workers manually:

```bash
# Terminal 1 — Worker
cd backend && uv run celery -A src.workers.celery_app worker -l info -Q default,scraping,enrichment,ai,outreach

# Terminal 2 — Beat (scheduler)
cd backend && uv run celery -A src.workers.celery_app beat -l info
```

---

## Testing the Platform

### Health Checks

```bash
# Backend health
curl http://localhost:8002/health

# API docs (Swagger UI)
open http://localhost:8002/docs

# Frontend
open http://localhost:3000
```

### Authentication Flow

```bash
# 1. Register a user
curl -X POST http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@company.com","password":"pass1234","full_name":"Test User"}'

# 2. Login → get JWT token
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@company.com","password":"pass1234"}'
# Response: {"access_token": "...", "token_type": "bearer"}

# 3. Use token on protected routes
TOKEN="your-jwt-token-here"
curl http://localhost:8002/api/v1/companies \
  -H "Authorization: Bearer $TOKEN"
```

### Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Create new tenant + user |
| `/api/v1/auth/login` | POST | Authenticate, receive JWT |
| `/api/v1/auth/refresh` | POST | Refresh access token |
| `/api/v1/companies` | GET/POST | List or create companies |
| `/api/v1/companies/{id}` | GET/PUT/DELETE | Company detail |
| `/api/v1/discovery/search` | POST | Run AI discovery search (async) |
| `/api/v1/discovery/parse-intent` | POST | Parse natural language intent |
| `/api/v1/enrichment/companies/{id}` | POST | Enrich a company with AI |
| `/api/v1/companies/{id}/score` | GET | Get opportunity score |
| `/api/v1/campaigns` | GET/POST | List or create campaigns |
| `/api/v1/campaigns/{id}/send` | POST | Launch campaign |
| `/api/v1/deals` | GET/POST | List or create deals |
| `/api/v1/conversations` | GET/POST | Conversations management |
| `/api/v1/conversations/{id}/ws` | WebSocket | Real-time chat |
| `/api/v1/analytics/dashboard` | GET | Dashboard metrics |
| `/api/v1/analytics/roi` | GET | ROI and cost analysis |
| `/api/v1/scoring/rules` | GET | Get scoring configuration |

### Running Discovery Search

```bash
curl -X POST http://localhost:8002/api/v1/discovery/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Buenos Aires, Argentina",
    "intent": "restaurants with website",
    "radius_km": 10,
    "max_results": 20,
    "sources": ["openstreetmap", "google_maps"]
  }'
```

This returns a `search_id`. Poll for results via `/api/v1/discovery/search/{search_id}/results`.

### Running Tests

```bash
# Backend tests
make test

# Backend with coverage
make test-cov

# Lint
make lint

# Format
make format

# Type checking
make typecheck

# All quality checks (runs in CI)
cd backend && uv run ruff check src tests && uv run ruff format --check src tests && uv run pyright src
```

---

## Configuration Reference

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | For AI features | OpenAI API key (gpt-4o-mini, gpt-4o) |

### Full Environment Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `development` | `development`, `staging`, `production` |
| `DEBUG` | `true` | Enable debug mode |
| `SECRET_KEY` | `change-me-in-production` | App secret (use strong random value) |
| `DATABASE_URL` | postgresql://...localhost:5432 | PostgreSQL connection string |
| `DATABASE_ECHO` | `false` | Log SQL queries |
| `REDIS_URL` | redis://localhost:6379/0 | Redis connection string |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch endpoint |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing key (use strong random value) |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `GOOGLE_CLIENT_ID` | `` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `` | Google OAuth client secret |
| `OPENAI_API_KEY` | `` | OpenAI API key |
| `ANTHROPIC_API_KEY` | `` | Anthropic API key |
| `GOOGLE_AI_API_KEY` | `` | Google AI / Gemini API key |
| `AI_DEFAULT_MODEL` | `openai/gpt-4o-mini` | Default model for tasks |
| `AI_SMART_MODEL` | `openai/gpt-4o` | Model for complex reasoning |
| `AI_EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Embedding model for pgvector |
| `PROXY_URL` | `` | Proxy for web scraping (format: `http://user:pass@host:port`) |
| `CAPTCHA_API_KEY` | `` | Anti-captcha service key |
| `SCRAPING_MAX_CONCURRENT` | `5` | Max concurrent browser contexts |
| `SCRAPING_DEFAULT_DELAY` | `2.0` | Delay between scraping requests (seconds) |
| `SMTP_HOST` | `` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | `` | SMTP username |
| `SMTP_PASSWORD` | `` | SMTP password |
| `SENDGRID_API_KEY` | `` | SendGrid API key (alternative to SMTP) |
| `WHATSAPP_API_TOKEN` | `` | WhatsApp Business API token |
| `WHATSAPP_PHONE_NUMBER_ID` | `` | WhatsApp Business phone number ID |
| `HUNTER_API_KEY` | `` | Hunter.io email finder key |
| `APOLLO_API_KEY` | `` | Apollo.io enrichment key |
| `CLEARBIT_API_KEY` | `` | Clearbit enrichment key |
| `PAGESPEED_API_KEY` | `` | Google PageSpeed Insights key |
| `CORS_ORIGINS` | `["http://localhost:3000", ...]` | Allowed CORS origins |
| `DEFAULT_LOCALE` | `es` | Default language (`es` or `en`) |
| `SUPPORTED_LOCALES` | `["es", "en"]` | Available languages |

---

## Development Workflow

### Local Backend (without Docker)

```bash
cd backend

# Install dependencies
uv sync --extra dev

# Setup database (must have Postgres + Redis running)
uv run alembic upgrade head

# Run with hot reload
uv run uvicorn src.api.app:app --reload --host 0.0.0.0 --port 8000

# In another terminal — run workers
uv run celery -A src.workers.celery_app worker -l info -Q default,scraping,enrichment,ai,outreach
uv run celery -A src.workers.celery_app beat -l info
```

### Local Frontend (without Docker)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:3000
```

### Adding a New Dependency

```bash
# Backend
docker compose exec backend uv add package-name

# Frontend
cd frontend && npm install package-name
```

### Database Migrations

```bash
# After modifying a domain model, generate migration:
make db-migrate msg="describe the change"

# Review the generated migration in backend/alembic/versions/

# Apply:
make db-upgrade

# Rollback:
make db-downgrade
```

---

## Project Structure

```
AI-Lead-Intelligence-Platform/ (Nexus)
├── backend/
│   ├── alembic/              # Database migrations
│   ├── src/
│   │   ├── core/              # Config, DB, Redis, Security, Events, Middleware
│   │   ├── domain/            # Domain models & repository interfaces
│   │   │   ├── campaign/, company/, contact/, conversation/, deal/, tenant/, user/
│   │   ├── application/       # Use cases & DTOs
│   │   │   ├── analytics/, auth/, crm/, discovery/, enrichment/, outreach/, scoring/, sdr/
│   │   ├── infrastructure/    # External service implementations
│   │   │   ├── ai/            # AI gateway, message generator, SDR agent, revenue agent
│   │   │   ├── cache/         # Redis caching layer
│   │   │   ├── database/      # SQLAlchemy repositories
│   │   │   ├── email/         # SMTP / SendGrid sender
│   │   │   ├── scraping/      # Playwright engine, plugins (Google Maps, Yelp, etc.)
│   │   │   ├── deliverability/# Email deliverability & warmup
│   │   │   └── whatsapp/      # WhatsApp Business API
│   │   ├── workers/           # Celery tasks (scoring, enrichment, scraping)
│   │   ├── mcp/               # MCP server (tool exposure for AI agents)
│   │   └── api/               # FastAPI routers
│   │       ├── v1/            # API v1 (45+ endpoints)
│   │       ├── app.py         # App factory, CORS, middleware, metrics
│   │       └── dependencies.py # Auth & DI
│   └── .env                   # Environment (gitignored)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/        # Login, Register
│   │   │   └── (dashboard)/   # 14 routes including Nexus AI, Discovery, Companies, etc.
│   │   ├── components/
│   │   │   ├── ui/            # Design system: Button, Card, Badge
│   │   │   ├── kanban/        # Drag-and-drop KanbanBoard
│   │   │   ├── revenue-agent/ # RevenueAgentChat (conversational AI)
│   │   │   ├── leads/LeadCard.tsx
│   │   │   └── map/MapView.tsx
│   │   ├── lib/               # API client, cn() utility, types
│   │   └── stores/            # Zustand auth store
│   ├── tailwind.config.ts     # Extended with 12+ animations, electric/cyan palette
│   └── globals.css            # 551-line glassmorphism design system
├── infra/docker/              # Dockerfiles & production compose
├── .github/workflows/ci.yml   # CI/CD pipeline
├── docker-compose.yml         # Dev services (hardened, no hardcoded secrets)
└── Makefile                   # Dev shortcuts
```

---

## CI/CD Pipeline

The GitHub Actions workflow (`ci.yml`) runs three jobs on every push/PR:

1. **Lint & Type Check** — `ruff check`, `ruff format --check`, `pyright`
2. **Tests** — `pytest` with Postgres + Redis services
3. **Build** — Docker image build (backend + frontend)

---

## Nexus Premium Features

### AI Revenue Agent (`/revenue-agent`)
A conversational AI agent that understands natural language and executes actions across the platform. Chat in Spanish or English to search companies, enrich data, score opportunities, analyze pipeline, and check campaign status. Backend: `backend/src/infrastructure/ai/revenue_agent/`. Frontend: `frontend/src/components/revenue-agent/RevenueAgentChat.tsx`.

### Real-Time WebSocket Chat (`/conversations`)
Each conversation connects via WebSocket for real-time messaging with AI SDR agent responses. Authentication via token, automatic reconnection, and optimistic message updates.

### Drag-and-Drop Kanban Pipeline (`/deals`)
Native HTML5 drag-and-drop Kanban board with animated drop zones, deal cards with value/probability, and stage transitions. Component: `frontend/src/components/kanban/KanbanBoard.tsx`.

### Premium Design System
551-line glassmorphism CSS system (`frontend/src/app/globals.css`) with electric purple + cyan accents, animated gradients, glow effects, shimmer skeletons, and premium scrollbars. Tailwind config extended with 12+ custom animations, mesh gradients, and semantic color tokens.

### Enhanced Security
- Redis-backed sliding window rate limiting (replaced leaky in-memory version)
- Production secrets validation (min 32 chars, entropy check, no defaults)
- CORS restricted to explicit methods/headers in production
- WebSocket duplicate-accept bug fixed
- Mandatory tenant_id in Celery scoring tasks (multi-tenancy compliance)
- API keys removed from docker-compose (env_file only)

## Known Gaps / Roadmap

| Priority | Feature | Status |
|----------|---------|--------|
| High | Add comprehensive test coverage (Playwright e2e tests, more pytest integration) | Thin (34 backend tests, 0 frontend) |
| Medium | Implement WhatsApp sender (package empty, generator exists) | Partial |
| Medium | Add Alembic migration history (only `create_all` exists) | Not started |
| Medium | Conversation summary AI uses placeholder template | Stub |
| Low | `Contact` domain model has no repo/routes/enrichment | Stub |
| Low | Production deployment: TLS reverse proxy, backups, IaC | Not started |

> Fixed: Celery beat tasks (`cleanup_stale_jobs`, `check_pending_conversations`) are
> implemented; discovery search runs async via Celery with Redis-backed result
> polling (`GET /discovery/search/{id}/status`); MCP server targets the installed
> `mcp` v2 SDK.

### Running the test suite

Tests require a live Postgres and Redis. Point them at the Docker services:

```bash
cd backend
TEST_DATABASE_URL='postgresql+asyncpg://leadplatform:leadplatform@localhost:5435/leadplatform_test' \
REDIS_URL='redis://localhost:6382/1' \
uv run pytest -q
```

Create the test database first:
`docker compose exec postgres psql -U leadplatform -d leadplatform -c "CREATE DATABASE leadplatform_test;"`

---

## License

Proprietary — All rights reserved.
