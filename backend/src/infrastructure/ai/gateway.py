"""
AI Gateway — unified interface for LLM providers.
Supports OpenAI-compatible APIs (LongCat, OpenAI, etc.).
"""

from __future__ import annotations

import json
import re
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
    raw: dict[str, object] = field(default_factory=dict)


class AIGateway:
    """Unified AI interface with model routing and fallback."""

    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is None:
            settings = get_settings()
            try:
                from openai import AsyncOpenAI

                base = settings.openai_api_base or "https://api.openai.com/v1"
                self._client = AsyncOpenAI(
                    api_key=settings.openai_api_key,
                    base_url=base,
                )
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

        # If JSON requested, append instruction to system message
        # (some providers don't support response_format properly)
        processed_messages = list(messages)
        if response_format == "json":
            for i, msg in enumerate(processed_messages):
                if msg.get("role") == "system":
                    hint = "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown."
                    processed_messages[i] = {
                        **msg,
                        "content": msg["content"] + hint,
                    }
                    break
            else:
                processed_messages.insert(
                    0,
                    {
                        "role": "system",
                        "content": "Respond with valid JSON only.",
                    },
                )

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=processed_messages,  # type: ignore[arg-type]
                temperature=temperature,
                max_tokens=max_tokens,
            )

            content = response.choices[0].message.content or ""
            # Strip markdown code fences if present
            if content.startswith("```"):
                content = content.split("\n", 1)[1] if "\n" in content else content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

            usage = response.usage
            base_url = settings.openai_api_base or ""
            return AIResponse(
                content=content,
                model=response.model,
                provider="longcat" if "longcat" in base_url else "openai",
                tokens_used=usage.total_tokens if usage else 0,
                finish_reason=response.choices[0].finish_reason or "",
                raw={"id": response.id},
            )

        except Exception as e:
            logger.error("ai_gateway_error", model=model, error=str(e))
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
            loc = company_data["city"]
            prov = company_data.get("province", "")
            context_parts.append(f"Location: {loc}, {prov}")
        if company_data.get("domain"):
            context_parts.append(f"Website: {company_data['domain']}")
        if seo_data:
            context_parts.append(f"SEO Score: {seo_data.get('score', 'N/A')}/100")
            if seo_data.get("issues"):
                issues = ", ".join(seo_data["issues"][:5])
                context_parts.append(f"SEO Issues: {issues}")
        if tech_data:
            if tech_data.get("technologies"):
                techs = ", ".join(tech_data["technologies"])
                context_parts.append(f"Technologies: {techs}")
            if tech_data.get("has_ssl") is False:
                context_parts.append("No SSL certificate")
            if tech_data.get("has_chatbot") is False:
                context_parts.append("No chatbot detected")
            if tech_data.get("has_ecommerce") is False:
                context_parts.append("No e-commerce detected")
        if social_data:
            count = social_data.get("social_count", 0)
            context_parts.append(f"Social profiles: {count}")

        context = "\n".join(context_parts)

        sys_prompt = (
            "You are a B2B sales analyst for a digital services agency. "
            "Analyze the company and provide a JSON response with: "
            "opportunity_score (0-100), "
            "opportunity_breakdown (object with scores for "
            "web_presence, seo, social, automation, technical), "
            "analysis (2-3 paragraph text analysis in Spanish), "
            "recommended_services (array of service names), "
            "estimated_deal_value (number in USD), "
            "priority (high/medium/low), probability (0-100), "
            "urgency (immediate/short_term/long_term). "
            "Focus on what digital services this company needs and why."
        )

        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": f"Analyze this company:\n\n{context}"},
        ]

        response = await self.complete(
            messages,
            model=settings.ai_smart_model,
            temperature=0.3,
            max_tokens=4000,
            response_format="json",
        )

        content = response.content.strip()

        # Try parsing directly
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # Try extracting JSON from markdown code fences
        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Try finding first { ... } block
        brace_match = re.search(r"\{.*\}", content, re.DOTALL)
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


_gateway: AIGateway | None = None


def get_ai_gateway() -> AIGateway:
    global _gateway
    if _gateway is None:
        _gateway = AIGateway()
    return _gateway
