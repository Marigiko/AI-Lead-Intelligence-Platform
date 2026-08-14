"""
Agent autonomy infrastructure — autonomy dial, knowledge base, objection handling.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import IntEnum
from typing import Optional

import structlog

logger = structlog.get_logger()


class AutonomyLevel(IntEnum):
    """How autonomous the AI agent is."""
    REVIEW_ALL = 1  # Human reviews every message
    AUTO_EXCEPT_OBJECTIONS = 2  # Auto unless objection detected
    FULL_AUTONOMY = 3  # Full autopilot based on rules


@dataclass
class KnowledgeBaseEntry:
    """A piece of knowledge for the AI agent."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    content: str = ""
    source: str = ""  # "pdf", "url", "manual"
    category: str = ""  # "pricing", "objections", "services", "faq"
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class KnowledgeBase:
    """Client knowledge base for AI agent."""
    entries: list[KnowledgeBaseEntry] = field(default_factory=list)

    def add_entry(self, content: str, source: str = "manual", category: str = "") -> KnowledgeBaseEntry:
        entry = KnowledgeBaseEntry(content=content, source=source, category=category)
        self.entries.append(entry)
        return entry

    def get_active(self) -> list[KnowledgeBaseEntry]:
        return [e for e in self.entries if e.is_active]

    def get_context(self) -> str:
        """Get knowledge as context for AI prompts."""
        active = self.get_active()
        if not active:
            return ""
        parts = []
        for entry in active:
            parts.append(f"[{entry.category}] {entry.content}")
        return "\n".join(parts)


# Common objection patterns and responses
COMMON_OBJECTIONS = {
    "too_expensive": {
        "patterns": ["muy caro", "muy costoso", "no tengo presupuesto", "expensive", "too much"],
        "category": "pricing",
    },
    "have_provider": {
        "patterns": ["ya tengo proveedor", "ya tenemos", "we already have", "not interested"],
        "category": "competition",
    },
    "no_time": {
        "patterns": ["no tengo tiempo", "now is not a good time", "mas adelante", "later"],
        "category": "timing",
    },
    "no_need": {
        "patterns": ["no lo necesito", "no need", "estamos bien", "we're fine"],
        "category": "need",
    },
    "think_about_it": {
        "patterns": ["lo pensare", "let me think", "te aviso", "i'll let you know"],
        "category": "hesitation",
    },
}


class ObjectionHandler:
    """Detects and handles common sales objections."""

    def detect_objection(self, message: str) -> Optional[dict]:
        """Detect if a message contains an objection."""
        msg_lower = message.lower()
        for objection_type, config in COMMON_OBJECTIONS.items():
            for pattern in config["patterns"]:
                if pattern in msg_lower:
                    return {
                        "type": objection_type,
                        "category": config["category"],
                        "confidence": "high" if len(pattern) > 10 else "medium",
                    }
        return None

    async def generate_response(
        self,
        objection: dict,
        knowledge_base: KnowledgeBase,
        company_name: str = "",
    ) -> str:
        """Generate a response to an objection using knowledge base."""
        context = knowledge_base.get_context()
        objection_type = objection["type"]

        # Build prompt
        prompt = f"Response to objection type: {objection_type}\n"
        if company_name:
            prompt += f"Company: {company_name}\n"
        if context:
            prompt += f"Knowledge base:\n{context}\n"
        prompt += "\nGenerate a short, friendly response (max 100 words) in Spanish."

        return prompt


# Singleton
_knowledge_base: KnowledgeBase | None = None
_objection_handler: ObjectionHandler | None = None


def get_knowledge_base() -> KnowledgeBase:
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = KnowledgeBase()
    return _knowledge_base


def get_objection_handler() -> ObjectionHandler:
    global _objection_handler
    if _objection_handler is None:
        _objection_handler = ObjectionHandler()
    return _objection_handler
