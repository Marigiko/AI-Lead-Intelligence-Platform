"""
Outreach application DTOs.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass
class CreateCampaignRequest:
    name: str
    type: str = "email"  # email, whatsapp, linkedin
    subject: str = ""
    ai_prompt: str = ""  # Instructions for AI message generation
    settings: dict[str, Any] = field(default_factory=dict)


@dataclass
class CampaignDTO:
    id: UUID
    name: str
    type: str
    status: str
    subject: str | None
    stats: dict[str, Any]
    created_at: datetime


@dataclass
class GenerateMessageRequest:
    company_id: UUID
    channel: str = "email"
    tone: str = "professional"
    custom_instructions: str = ""


@dataclass
class GeneratedMessageDTO:
    subject: str
    body: str
    channel: str
    company_id: UUID
    personalization_notes: str = ""
