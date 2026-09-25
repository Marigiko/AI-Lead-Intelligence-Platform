"""
Revenue Agent — conversational AI for lead intelligence.

An autonomous agent that understands natural language and executes
actions: searching companies, enriching data, scoring opportunities,
analyzing pipeline, and providing intelligent recommendations.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

import structlog

from src.infrastructure.ai.gateway import get_ai_gateway

logger = structlog.get_logger()


class AgentIntent(StrEnum):
    """Intents the Revenue Agent can handle."""

    SEARCH_COMPANIES = "search_companies"
    ENRICH_COMPANY = "enrich_company"
    SCORE_COMPANY = "score_company"
    PIPELINE_ANALYTICS = "pipeline_analytics"
    CAMPAIGN_STATUS = "campaign_status"
    COMPANY_INFO = "company_info"
    HELP = "help"
    GREETING = "greeting"
    UNKNOWN = "unknown"


@dataclass
class AgentAction:
    """An action to execute."""

    intent: AgentIntent
    parameters: dict[str, Any] = field(default_factory=dict)
    requires_clarification: bool = False
    clarification_prompt: str = ""


@dataclass
class AgentResponse:
    """Response from the Revenue Agent."""

    message: str
    intent: AgentIntent
    data: dict[str, Any] | None = None
    suggestions: list[str] = field(default_factory=list)
    actions_taken: list[str] = field(default_factory=list)


class RevenueAgent:
    """
    Conversational AI agent for revenue intelligence.

    Understands natural language queries and executes actions
    against the lead intelligence platform.
    """

    # Available capabilities for the system prompt
    CAPABILITIES = """
You are Nexus AI, the autonomous revenue intelligence agent for the Nexus platform.
You help sales teams discover opportunities, analyze pipeline, and take action.

Your capabilities:
1. Search companies — Find businesses by location, industry, or criteria
2. Enrich data — Get detailed company info (tech stack, SEO, contacts)
3. Score opportunities — Analyze deal potential (0-100)
4. Pipeline analytics — View deal stages, values, conversion rates
5. Campaign status — Check email campaign performance
6. Company info — Get specific company details

You communicate in the user's language (Spanish/English).
Be concise, actionable, and insightful.
Always suggest next steps the user can take.
"""

    # Intent classification examples
    INTENT_EXAMPLES = """
Classify the user's intent and extract parameters.

Examples:
- "Busca restaurantes en Buenos Aires" →
  search_companies {location: "Buenos Aires", industry: "restaurantes"}
- "Analiza la empresa acme.com" → enrich_company {domain: "acme.com"}
- "Score de acme.com" → score_company {domain: "acme.com"}
- "Cómo va el pipeline" → pipeline_analytics {}
- "Estado de campañas" → campaign_status {}
- "Info de Empresa XYZ" → company_info {name: "Empresa XYZ"}
- "Hola" → greeting {}
- "Qué puedes hacer" → help {}
"""

    def __init__(self) -> None:
        self._ai = get_ai_gateway()

    async def process_message(
        self,
        message: str,
        conversation_history: list[dict[str, str]] | None = None,
        tenant_id: str | None = None,
    ) -> AgentResponse:
        """
        Process a natural language message and execute the appropriate action.

        Args:
            message: User's natural language input
            conversation_history: Previous messages for context
            tenant_id: Tenant ID for data isolation

        Returns:
            AgentResponse with message, data, and suggestions
        """
        history = conversation_history or []

        # Step 1: Classify intent
        action = await self._classify_intent(message, history)

        if action.requires_clarification:
            return AgentResponse(
                message=action.clarification_prompt,
                intent=action.intent,
                suggestions=self._get_suggestions(action.intent),
            )

        # Step 2: Execute action
        response = await self._execute_action(action, tenant_id)

        # Step 3: Add contextual suggestions
        response.suggestions = self._get_follow_up_suggestions(action.intent, response.data)

        return response

    async def _classify_intent(
        self,
        message: str,
        history: list[dict[str, str]],
    ) -> AgentAction:
        """Classify user intent from natural language."""

        # Fast path: pattern matching for common queries
        pattern_intent = self._pattern_classify(message.lower())
        if pattern_intent:
            return pattern_intent

        # AI-powered classification for complex queries
        system_prompt = (
            f"{self.CAPABILITIES}\n\n{self.INTENT_EXAMPLES}\n\n"
            "Return JSON with: intent, parameters (object), requires_clarification (bool), "
            "clarification_prompt (string if needs clarification)"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            *history[-5:],  # Last 5 messages for context
            {"role": "user", "content": message},
        ]

        try:
            response = await self._ai.complete(
                messages,
                temperature=0.2,
                max_tokens=500,
                response_format="json",
            )
            data = self._parse_json(response.content)

            intent_str = data.get("intent", "unknown")
            try:
                intent = AgentIntent(intent_str)
            except ValueError:
                intent = AgentIntent.UNKNOWN

            return AgentAction(
                intent=intent,
                parameters=data.get("parameters", {}),
                requires_clarification=data.get("requires_clarification", False),
                clarification_prompt=data.get("clarification_prompt", ""),
            )
        except Exception as e:
            logger.error("intent_classification_error", error=str(e))
            return AgentAction(
                intent=AgentIntent.UNKNOWN,
                requires_clarification=True,
                clarification_prompt=(
                    "No entendí tu consulta. ¿Podrías reformularla? Puedo ayudarte a buscar "
                    "empresas, analizar oportunidades, o revisar tu pipeline."
                ),
            )

    def _pattern_classify(self, message: str) -> AgentAction | None:
        """Fast intent classification using patterns."""

        # Greeting patterns
        if re.match(r"^(hola|hey|buenas|buenos días|hi|hello|qué tal)", message):
            return AgentAction(
                intent=AgentIntent.GREETING,
                parameters={},
            )

        # Help patterns
        if re.match(r"(qué puedes|que puedes|help|ayuda|opciones|capabilities|qué haces)", message):
            return AgentAction(
                intent=AgentIntent.HELP,
                parameters={},
            )

        # Search patterns
        search_match = re.search(
            r"(busca(r)?|busco|encuentra(r)?|search|find)\s+(empresas|negocios|compañías|clientes|leads)?\s*(de|en|por)?\s*(.+)?",
            message,
        )
        if search_match:
            location = self._extract_location(message)
            industry = search_match.group(5) or self._extract_industry(message)
            return AgentAction(
                intent=AgentIntent.SEARCH_COMPANIES,
                parameters={"location": location, "industry": industry},
                requires_clarification=not location and not industry,
                clarification_prompt=(
                    "¿Qué tipo de empresas buscas y en qué ubicación? "
                    "Por ejemplo: 'restaurantes en Buenos Aires'"
                ),
            )

        # Enrich/company info patterns
        enrich_match = re.search(
            r"(analiza(r)?|enriquece(r)?|info(rmación)? de|detalles de|información sobre)\s+"
            r"(la empresa\s+)?(.+)?",
            message,
        )
        if enrich_match:
            target = enrich_match.group(5) or enrich_match.group(4)
            if target:
                target = target.strip()
                if "." in target:
                    return AgentAction(
                        intent=AgentIntent.ENRICH_COMPANY,
                        parameters={"domain": target},
                    )
                return AgentAction(
                    intent=AgentIntent.COMPANY_INFO,
                    parameters={"name": target},
                )

        # Score patterns
        score_match = re.search(
            r"(score|puntuación|puntaje|evalúa|evalua|analiza oportunidad)\s+(de\s+)?(.+)?",
            message,
        )
        if score_match:
            target = score_match.group(3)
            if target:
                target = target.strip()
                if "." in target:
                    return AgentAction(
                        intent=AgentIntent.SCORE_COMPANY,
                        parameters={"domain": target},
                    )
                return AgentAction(
                    intent=AgentIntent.SCORE_COMPANY,
                    parameters={"name": target},
                )

        # Pipeline patterns
        if re.match(r"(pipeline|cómo va|estado del|deals|negocios|embudo|funel)", message):
            return AgentAction(
                intent=AgentIntent.PIPELINE_ANALYTICS,
                parameters={},
            )

        # Campaign patterns
        if re.match(r"(campaña|campaign|emails?|envíos?|outreach)", message):
            return AgentAction(
                intent=AgentIntent.CAMPAIGN_STATUS,
                parameters={},
            )

        return None

    async def _execute_action(
        self,
        action: AgentAction,
        tenant_id: str | None,
    ) -> AgentResponse:
        """Execute the classified action."""

        handlers = {
            AgentIntent.GREETING: self._handle_greeting,
            AgentIntent.HELP: self._handle_help,
            AgentIntent.SEARCH_COMPANIES: self._handle_search,
            AgentIntent.ENRICH_COMPANY: self._handle_enrich,
            AgentIntent.SCORE_COMPANY: self._handle_score,
            AgentIntent.PIPELINE_ANALYTICS: self._handle_pipeline,
            AgentIntent.CAMPAIGN_STATUS: self._handle_campaign_status,
            AgentIntent.COMPANY_INFO: self._handle_company_info,
            AgentIntent.UNKNOWN: self._handle_unknown,
        }

        handler = handlers.get(action.intent, self._handle_unknown)
        return await handler(action.parameters, tenant_id)

    async def _handle_greeting(
        self,
        _params: dict[str, Any],
        _tenant_id: str | None,
    ) -> AgentResponse:
        """Handle greeting intent."""
        return AgentResponse(
            message=(
                "¡Hola! Soy Nexus AI, tu agente de inteligencia revenue. Puedo ayudarte a "
                "descubrir oportunidades, analizar tu pipeline y ejecutar acciones comerciales. "
                "¿En qué te ayudo hoy?"
            ),
            intent=AgentIntent.GREETING,
            suggestions=[
                "Buscar empresas en mi zona",
                "Analizar mi pipeline",
                "Evaluar una empresa específica",
            ],
        )

    async def _handle_help(
        self,
        _params: dict[str, Any],
        _tenant_id: str | None,
    ) -> AgentResponse:
        """Handle help intent."""
        return AgentResponse(
            message=(
                "Esto es lo que puedo hacer por ti:\n\n"
                "🔍 **Buscar empresas** — 'Busca restaurantes en Madrid'\n"
                "📊 **Analizar empresa** — 'Analiza acme.com'\n"
                "⭐ **Evaluar oportunidad** — 'Score de acme.com'\n"
                "📈 **Ver pipeline** — 'Cómo va mi pipeline'\n"
                "📧 **Estado campañas** — 'Estado de mis campañas'\n"
                "🏢 **Info empresa** — 'Información de Empresa XYZ'\n\n"
                "Puedes escribir en lenguaje natural, ¡yo me encargo del resto!"
            ),
            intent=AgentIntent.HELP,
            suggestions=[
                "Buscar empresas potenciales",
                "Revisar mi pipeline",
                "Evaluar una empresa",
            ],
        )

    async def _handle_search(
        self,
        params: dict[str, Any],
        tenant_id: str | None,
    ) -> AgentResponse:
        """Handle company search intent."""
        location = params.get("location", "")
        industry = params.get("industry", "")

        # Return search parameters for frontend to execute
        return AgentResponse(
            message=(
                f"Voy a buscar empresas{' de ' + industry if industry else ''}"
                f"{' en ' + location if location else ''}. Procesando..."
            ),
            intent=AgentIntent.SEARCH_COMPANIES,
            data={
                "action": "execute_search",
                "location": location,
                "industry": industry,
                "tenant_id": tenant_id,
            },
            actions_taken=["Preparando búsqueda de empresas"],
            suggestions=[
                "Refinar búsqueda por sector",
                "Ver resultados en el mapa",
                "Enriquecer empresas encontradas",
            ],
        )

    async def _handle_enrich(
        self,
        params: dict[str, Any],
        tenant_id: str | None,
    ) -> AgentResponse:
        """Handle company enrichment intent."""
        domain = params.get("domain", "")

        return AgentResponse(
            message=(
                f"Analizando {domain}... Voy a obtener datos de presencia digital, "
                "tecnología, SEO y contacto."
            ),
            intent=AgentIntent.ENRICH_COMPANY,
            data={
                "action": "execute_enrichment",
                "domain": domain,
                "tenant_id": tenant_id,
            },
            actions_taken=[f"Solicitando enriquecimiento de {domain}"],
            suggestions=[
                "Ver score de oportunidad",
                "Iniciar outreach",
                "Agregar a campaña",
            ],
        )

    async def _handle_score(
        self,
        params: dict[str, Any],
        tenant_id: str | None,
    ) -> AgentResponse:
        """Handle scoring intent."""
        domain = params.get("domain", "")
        name = params.get("name", "")
        target = domain or name

        return AgentResponse(
            message=(
                f"Evaluando oportunidad de {target}... Analizando presencia digital, "
                "SEO, tecnología y señales de compra."
            ),
            intent=AgentIntent.SCORE_COMPANY,
            data={
                "action": "execute_scoring",
                "domain": domain,
                "name": name,
                "tenant_id": tenant_id,
            },
            actions_taken=[f"Calculando score de {target}"],
            suggestions=[
                "Ver desglose detallado",
                "Comparar con otras empresas",
                "Crear deal en pipeline",
            ],
        )

    async def _handle_pipeline(
        self,
        _params: dict[str, Any],
        tenant_id: str | None,
    ) -> AgentResponse:
        """Handle pipeline analytics intent."""
        return AgentResponse(
            message="Analizando tu pipeline... Obteniendo métricas de negocios, etapas y valores.",
            intent=AgentIntent.PIPELINE_ANALYTICS,
            data={
                "action": "get_pipeline_analytics",
                "tenant_id": tenant_id,
            },
            actions_taken=["Recopilando datos del pipeline"],
            suggestions=[
                "Ver deals por etapa",
                "Identificar cuellos de botella",
                "Crear nuevo deal",
            ],
        )

    async def _handle_campaign_status(
        self,
        _params: dict[str, Any],
        tenant_id: str | None,
    ) -> AgentResponse:
        """Handle campaign status intent."""
        return AgentResponse(
            message="Revisando estado de campañas... Métricas de envío, apertura y respuestas.",
            intent=AgentIntent.CAMPAIGN_STATUS,
            data={
                "action": "get_campaign_status",
                "tenant_id": tenant_id,
            },
            actions_taken=["Obteniendo métricas de campañas"],
            suggestions=[
                "Ver campañas activas",
                "Iniciar nueva campaña",
                "Analizar entregabilidad",
            ],
        )

    async def _handle_company_info(
        self,
        params: dict[str, Any],
        tenant_id: str | None,
    ) -> AgentResponse:
        """Handle company info intent."""
        name = params.get("name", "")

        return AgentResponse(
            message=f"Buscando información de {name}...",
            intent=AgentIntent.COMPANY_INFO,
            data={
                "action": "get_company_info",
                "name": name,
                "tenant_id": tenant_id,
            },
            actions_taken=[f"Buscando {name}"],
            suggestions=[
                "Enriquecer datos",
                "Evaluar score",
                "Ver en el mapa",
            ],
        )

    async def _handle_unknown(
        self,
        _params: dict[str, Any],
        _tenant_id: str | None,
    ) -> AgentResponse:
        """Handle unknown intent."""
        return AgentResponse(
            message=(
                "No estoy seguro de lo que necesitas. ¿Puedes reformular tu consulta? "
                "Puedo ayudarte con búsquedas de empresas, análisis de oportunidades, "
                "o revisar tu pipeline."
            ),
            intent=AgentIntent.UNKNOWN,
            suggestions=[
                "Buscar empresas",
                "Analizar pipeline",
                "Qué puedes hacer",
            ],
        )

    def _get_suggestions(self, intent: AgentIntent) -> list[str]:
        """Get contextual suggestions for an intent."""
        suggestions_map: dict[AgentIntent, list[str]] = {
            AgentIntent.GREETING: ["Buscar empresas", "Ver pipeline", "Qué puedes hacer"],
            AgentIntent.HELP: ["Buscar empresas", "Analizar empresa", "Ver campañas"],
            AgentIntent.SEARCH_COMPANIES: [
                "Ver en mapa",
                "Enriquecer resultados",
                "Filtrar por score",
            ],
            AgentIntent.ENRICH_COMPANY: ["Ver score", "Iniciar outreach", "Agregar a campaña"],
            AgentIntent.SCORE_COMPANY: ["Ver desglose", "Crear deal", "Comparar"],
            AgentIntent.PIPELINE_ANALYTICS: ["Ver por etapa", "Crear deal", "Métricas detalladas"],
            AgentIntent.CAMPAIGN_STATUS: ["Nueva campaña", "Entregabilidad", "Templates"],
            AgentIntent.COMPANY_INFO: ["Enriquecer", "Score", "Contactar"],
            AgentIntent.UNKNOWN: ["Buscar empresas", "Ver pipeline", "Ayuda"],
        }
        return suggestions_map.get(intent, ["Buscar empresas", "Ver pipeline"])

    def _get_follow_up_suggestions(
        self,
        intent: AgentIntent,
        data: dict[str, Any] | None,
    ) -> list[str]:
        """Get follow-up suggestions based on action results."""
        if not data:
            return self._get_suggestions(intent)

        # If action requires frontend execution, suggest confirmation
        if data.get("action"):
            return self._get_suggestions(intent)

        return self._get_suggestions(intent)

    def _extract_location(self, message: str) -> str:
        """Extract location from message."""
        # Common location patterns
        patterns = [
            r"(?:en|de|desde|cerca de)\s+([A-Z][a-záéíóúñ]+(?:\s*,\s*[A-Z][a-záéíóúñ]+)*)",
            r"(?:location|ubicación|ciudad|zona)\s*:\s*(.+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return ""

    def _extract_industry(self, message: str) -> str:
        """Extract industry/sector from message."""
        industries = [
            "restaurantes",
            "restaurant",
            "hoteles",
            "hotel",
            "abogados",
            "lawyers",
            "médicos",
            "doctors",
            "constructoras",
            "construction",
            "inmobiliarias",
            "real estate",
            "tecnología",
            "technology",
            "agencias",
            "agency",
            "comercio",
            "retail",
            "mayorista",
            "wholesale",
            "fabricación",
            "manufacturing",
            "agricultura",
            "agriculture",
            "educación",
            "education",
            "salud",
            "healthcare",
            "automotriz",
            "automotive",
            "finanzas",
            "finance",
        ]
        message_lower = message.lower()
        for industry in industries:
            if industry in message_lower:
                return industry
        return ""

    def _parse_json(self, content: str) -> dict[str, Any]:
        """Parse JSON from AI response, handling various formats."""
        content = content.strip()

        # Try direct parse
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown fences
        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Try finding first { ... }
        brace_match = re.search(r"\{.*\}", content, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        return {}


# Singleton
_agent: RevenueAgent | None = None


def get_revenue_agent() -> RevenueAgent:
    """Get the singleton Revenue Agent instance."""
    global _agent
    if _agent is None:
        _agent = RevenueAgent()
    return _agent
