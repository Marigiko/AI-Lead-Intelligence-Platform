# Architecture Overview

## System Architecture

The AI Lead Intelligence Platform follows a **modular monolith** architecture with clear domain boundaries, designed for future microservice extraction if needed.

### Layers

```
┌─────────────────────────────────────────────┐
│                 Frontend                      │
│  Next.js 14 / React / TypeScript / Tailwind  │
└──────────────────────┬──────────────────────┘
                       │ HTTP/WebSocket
┌──────────────────────▼──────────────────────┐
│              API Gateway                      │
│  FastAPI + Middleware (Auth, Rate Limit,      │
│  Security Headers, Request Logging)           │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│           Application Layer                   │
│  Use Cases / DTOs / Orchestration             │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│            Domain Layer                       │
│  Models / Repository Interfaces / Events      │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│         Infrastructure Layer                  │
│  Repository Impls / Scrapers / AI / Email     │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│            Data Layer                         │
│  PostgreSQL / Redis / Elasticsearch           │
└─────────────────────────────────────────────┘
```

### Bounded Contexts

| Context | Domain Models | Application Services |
|---------|--------------|---------------------|
| Platform | Tenant, User | Auth, Settings |
| Discovery | Company, CompanySource | DiscoveryOrchestrator |
| Enrichment | — | EnrichmentOrchestrator |
| Scoring | — | ScoringEngine, AI Analysis |
| Outreach | Campaign, CampaignLead, MessageTemplate | OutreachUseCases |
| SDR | Conversation, ConversationMessage | SDRUseCases, SDRAgent |
| CRM | Deal, Activity, PipelineStage | CRMUseCases |
| Analytics | — | AnalyticsUseCases |

### Data Flow

1. **Discovery**: User inputs location + intent → Geocoding → Intent parsing → Multi-source scraping → Deduplication → Save companies
2. **Enrichment**: Company URL → Tech detection → SEO analysis → Social detection → Save enriched data
3. **Scoring**: Enriched data → Rules engine → AI analysis → Opportunity score + recommendations
4. **Outreach**: Scored leads → AI message generation → Campaign → Email/WhatsApp sending → Tracking
5. **SDR**: Incoming message → Intent classification → AI response → State machine → Escalation if needed
6. **CRM**: Qualified leads → Deal creation → Pipeline stages → Activity timeline → Revenue tracking

### Key Design Decisions

1. **Modular monolith over microservices**: Simpler deployment, easier debugging, can extract later
2. **Repository pattern**: Clean domain layer, easy to swap implementations
3. **Event-driven internal**: Domain events for decoupling, Redis pub/sub for cross-worker
4. **AI gateway abstraction**: LiteLLM for multi-model support, easy to add providers
5. **Plugin-based scrapers**: New sources without modifying core
6. **Row-level security**: Multi-tenancy via tenant_id on all tables
