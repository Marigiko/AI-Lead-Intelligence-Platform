# API Documentation

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "Juan Perez",
  "company_name": "Mi Agencia"
}
```

Response:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

## Discovery

### Search Companies

```http
POST /api/v1/discovery/search
Content-Type: application/json

{
  "location": "Resistencia, Chaco",
  "radius_km": 50,
  "intent": "Empresas con pagina web obsoleta",
  "max_results": 100
}
```

### Parse Intent

```http
POST /api/v1/discovery/parse-intent
Content-Type: application/json

{
  "intent": "Empresas sin presencia digital que necesiten marketing"
}
```

## Companies

### List Companies

```http
GET /api/v1/companies?offset=0&limit=20&search=constructora&min_score=80
```

### Get Company

```http
GET /api/v1/companies/{id}
```

## Enrichment

### Enrich Company

```http
POST /api/v1/enrichment/enrich
Content-Type: application/json

{
  "company_id": "uuid"
}
```

### AI Analyze + Score

```http
POST /api/v1/enrichment/analyze
Content-Type: application/json

{
  "company_id": "uuid"
}
```

## Campaigns

### Create Campaign

```http
POST /api/v1/campaigns
Content-Type: application/json

{
  "name": "Empresas Resistencia - Web",
  "type": "email",
  "subject": "Su pagina web necesita una actualizacion"
}
```

### Generate Messages (AI)

```http
POST /api/v1/campaigns/{id}/generate
Content-Type: application/json

{
  "sender_name": "Juan",
  "sender_company": "Mi Agencia",
  "sender_services": "desarrollo web y marketing digital"
}
```

### Send Campaign

```http
POST /api/v1/campaigns/{id}/send
```

## Conversations (SDR)

### Send Message

```http
POST /api/v1/conversations/{id}/messages
Content-Type: application/json

{
  "message": "Si, estamos interesados en mejorar nuestra web",
  "role": "contact"
}
```

## Deals (CRM)

### Get Pipeline

```http
GET /api/v1/deals/pipeline
```

### Create Deal

```http
POST /api/v1/deals
Content-Type: application/json

{
  "title": "Constructora Chaco - Website nuevo",
  "value": 5000,
  "company_id": "uuid",
  "services": ["Desarrollo web", "SEO"]
}
```

## Analytics

```http
GET /api/v1/analytics/overview
GET /api/v1/analytics/pipeline
GET /api/v1/analytics/campaigns
GET /api/v1/analytics/geo
GET /api/v1/analytics/industries
GET /api/v1/analytics/roi
```

## WebSocket

```javascript
const ws = new WebSocket("ws://localhost:8000/api/v1/conversations/ws/{conversation_id}");
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

## Interactive Docs

- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`
