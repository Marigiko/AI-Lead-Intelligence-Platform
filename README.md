# AI Lead Intelligence Platform

Automated B2B sales pipeline powered by AI. Discovers companies, enriches data, scores opportunities, generates personalized outreach, and acts as an autonomous SDR.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL 16 + pgvector, Redis 7, Elasticsearch 8 |
| Task Queue | Celery + Redis |
| AI | LiteLLM (OpenAI, Anthropic, Gemini), RAG |
| Scraping | Playwright, BeautifulSoup |
| Container | Docker, Docker Compose |

## Quick Start

```bash
# 1. Clone and enter directory
cd ai-lead-platform

# 2. Start all services
make dev

# 3. Run database migrations
make db-upgrade

# 4. Seed sample data
docker compose exec backend uv run python -m data.seeds.seed_companies

# 5. Open the app
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/api/v1/docs
# Login: admin@demo.com / demo1234
```

## Development

```bash
# Start services
make dev

# View logs
make logs

# Run tests
make test

# Format code
make format

# Type checking
make typecheck

# Generate migration
make db-migrate msg="add companies table"

# Apply migrations
make db-upgrade
```

## Project Structure

```
backend/
  src/
    core/           # Config, DB, Redis, Security, Events
    domain/         # Domain models and repository interfaces
    application/    # Use cases and DTOs
    infrastructure/ # Repository implementations, scrapers, AI
    workers/        # Celery task definitions
    api/            # FastAPI routes
  alembic/          # Database migrations

frontend/
  src/
    app/            # Next.js App Router pages
    components/     # React components
    lib/            # Utilities and hooks
    stores/         # Zustand state stores

infra/              # Docker, Kubernetes, scripts
data/seeds/         # Seed data
docs/               # Documentation
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your API keys:

- `OPENAI_API_KEY` — For AI features (analysis, message generation)
- `GOOGLE_AI_API_KEY` — Alternative AI provider
- `SMTP_*` — Email sending
- `WHATSAPP_*` — WhatsApp Business API
- `HUNTER_API_KEY` — Contact enrichment

## License

Proprietary — All rights reserved.
