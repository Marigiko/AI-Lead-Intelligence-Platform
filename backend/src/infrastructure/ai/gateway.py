"""
AI Gateway — unified interface for LLM providers.
Supports OpenAI-compatible APIs (LongCat, OpenAI, etc.) and LiteLLM.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog

from src.core.config import get_settings

logger = structlog.get_logger()


@dataclass
class AIResponse:
    """Response from the AI gateway."""

    content: str
    model: str
    provider: str
    tokens_used: int = 0
    cost_usd: float = 0.0
    finish_reason: str = ""
    raw: dict[str, Any] = field(default_factory=dict)  # pyright: ignore[reportUnknownVariableType]


class AIGateway:
    """Unified AI interface with model routing and fallback."""

    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is None:
            settings = get_settings()
            try:
                import litellm

                litellm.success_callback = []
                litellm.failure_callback = []
                self._client = litellm
            except ImportError:
                logger.error("openai_not_installed")
                raise
        return self._client

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: str | None = None,
    ) -> AIResponse:
        """Send a completion request to the AI gateway."""
        settings = get_settings()
        model = model or settings.ai_default_model

        client = self._get_client()

        try:
            # If JSON requested, append instruction to system message instead of using response_format
            # (some providers don't support response_format properly)
            processed_messages = list(messages)
            if response_format == "json":
                for i, msg in enumerate(processed_messages):
                    if msg.get("role") == "system":
                        processed_messages[i] = {**msg, "content": msg["content"] + "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, just raw JSON."}
                        break
                else:
                    processed_messages.insert(0, {"role": "system", "content": "Respond with valid JSON only. No markdown, no code fences, just raw JSON."})

            kwargs: dict[str, Any] = {
                "model": model,
                "messages": processed_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            litellm_client: Any = client
            response: Any = litellm_client.completion(**kwargs)

            if not hasattr(response, "choices") or not response.choices:
                content_str = str(getattr(response, "content", ""))
                return AIResponse(
                    content=content_str,
                    model=model,
                    provider=model.split("/")[0] if "/" in model else "unknown",
                    tokens_used=0,
                    finish_reason="",
                    raw={"id": str(getattr(response, "id", ""))},
                )

            choices = response.choices
            message = choices[0].message
            content = message.content or ""
            usage = getattr(response, "usage", None)
            resp_model = response.model or model

            return AIResponse(
                content=content,
                model=resp_model,
                provider=str(resp_model).split("/")[0] if "/" in str(resp_model) else "unknown",
                tokens_used=usage.total_tokens if usage else 0,
                finish_reason=choices[0].finish_reason or "",
                raw={"id": str(getattr(response, "id", ""))},
            )

        except Exception as e:
            logger.error("ai_gateway_error", model=model, error=str(e))
            # Fallback to default model
            if model != settings.ai_default_model:
                logger.info("ai_fallback", from_model=model, to_model=settings.ai_default_model)
                return await self.complete(
                    messages,
                    model=settings.ai_default_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            raise

    async def analyze_company(
        self,
        company_data: dict[str, Any],
        seo_data: dict[str, Any] | None = None,
        tech_data: dict[str, Any] | None = None,
        social_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Use AI to analyze a company and generate insights."""
        settings = get_settings()

        context_parts = [f"Company: {company_data.get('name', 'Unknown')}"]
        if company_data.get("industry"):
            context_parts.append(f"Industry: {company_data['industry']}")
        if company_data.get("city"):
            context_parts.append(
                f"Location: {company_data['city']}, {company_data.get('province', '')}"
            )
        if company_data.get("domain"):
            context_parts.append(f"Website: {company_data['domain']}")
        if seo_data:
            context_parts.append(f"SEO Score: {seo_data.get('score', 'N/A')}/100")
            if seo_data.get("issues"):
                context_parts.append(f"SEO Issues: {', '.join(seo_data['issues'][:5])}")
        if tech_data:
            if tech_data.get("technologies"):
                context_parts.append(f"Technologies: {', '.join(tech_data['technologies'])}")
            if tech_data.get("has_ssl") is False:
                context_parts.append("No SSL certificate")
            if tech_data.get("has_chatbot") is False:
                context_parts.append("No chatbot detected")
            if tech_data.get("has_ecommerce") is False:
                context_parts.append("No e-commerce detected")
        if social_data:
            context_parts.append(f"Social profiles: {social_data.get('social_count', 0)}")

        context = "\n".join(context_parts)

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a B2B sales analyst for a digital services agency. "
                    "Analyze the company and provide a JSON response with: "
                    "opportunity_score (0-100), "
                    "opportunity_breakdown (object with scores for "
                    "web_presence, seo, social, automation, technical), "
                    "analysis (2-3 paragraph text analysis in Spanish), "
                    "recommended_services (array of service names), "
                    "estimated_deal_value (number in USD), "
                    "priority (high/medium/low), "
                    "probability (0-100), "
                    "urgency (immediate/short_term/long_term). "
                    "Focus on what digital services this company needs and why."
                ),
            },
            {
                "role": "user",
                "content": f"Analyze this company:\n\n{context}",
            },
        ]

        response = await self.complete(
            messages,
            model=settings.ai_smart_model,
            temperature=0.3,
            max_tokens=4000,
            response_format="json",
        )

        import json

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # Try extracting JSON from markdown code fences
        json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Try finding first { ... } block
        brace_match = re.search(r'\{.*\}', content, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        logger.error("ai_invalid_json", content=content[:200])
        return {
            "opportunity_score": 50,
            "analysis": content,
            "recommended_services": [],
            "estimated_deal_value": 0,
        }


# Singleton
_gateway: AIGateway | None = None


def get_ai_gateway() -> AIGateway:
    global _gateway
    if _gateway is None:
        _gateway = AIGateway()
    return _gateway
