"""
SDR Agent — autonomous conversation handler with state machine.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

import structlog

from src.infrastructure.ai.gateway import get_ai_gateway

logger = structlog.get_logger()


class ConversationState(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    INTERESTED = "interested"
    OBJECTION = "objection"
    MEETING_REQUEST = "meeting_request"
    MEETING_SCHEDULED = "meeting_scheduled"
    NEGOTIATING = "negotiating"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"
    ESCALATED = "escalated"
    FOLLOW_UP = "follow_up"


class IntentType(StrEnum):
    INTEREST = "interest"
    OBJECTION = "objection"
    QUESTION = "question"
    MEETING_REQUEST = "meeting_request"
    NOT_INTERESTED = "not_interested"
    OUT_OF_OFFICE = "out_of_office"
    WRONG_PERSON = "wrong_person"
    REFERRAL = "referral"
    UNCLEAR = "unclear"


# State transitions
STATE_TRANSITIONS: dict[ConversationState, dict[IntentType, ConversationState]] = {
    ConversationState.NEW: {
        IntentType.INTEREST: ConversationState.INTERESTED,
        IntentType.OBJECTION: ConversationState.OBJECTION,
        IntentType.MEETING_REQUEST: ConversationState.MEETING_REQUEST,
        IntentType.NOT_INTERESTED: ConversationState.CLOSED_LOST,
        IntentType.QUESTION: ConversationState.INTERESTED,
        IntentType.UNCLEAR: ConversationState.FOLLOW_UP,
    },
    ConversationState.CONTACTED: {
        IntentType.INTEREST: ConversationState.INTERESTED,
        IntentType.OBJECTION: ConversationState.OBJECTION,
        IntentType.MEETING_REQUEST: ConversationState.MEETING_REQUEST,
        IntentType.NOT_INTERESTED: ConversationState.CLOSED_LOST,
        IntentType.QUESTION: ConversationState.INTERESTED,
        IntentType.UNCLEAR: ConversationState.FOLLOW_UP,
    },
    ConversationState.INTERESTED: {
        IntentType.INTEREST: ConversationState.INTERESTED,
        IntentType.OBJECTION: ConversationState.OBJECTION,
        IntentType.MEETING_REQUEST: ConversationState.MEETING_REQUEST,
        IntentType.NOT_INTERESTED: ConversationState.CLOSED_LOST,
        IntentType.QUESTION: ConversationState.INTERESTED,
    },
    ConversationState.OBJECTION: {
        IntentType.INTEREST: ConversationState.INTERESTED,
        IntentType.OBJECTION: ConversationState.OBJECTION,
        IntentType.MEETING_REQUEST: ConversationState.MEETING_REQUEST,
        IntentType.NOT_INTERESTED: ConversationState.CLOSED_LOST,
        IntentType.QUESTION: ConversationState.INTERESTED,
    },
    ConversationState.FOLLOW_UP: {
        IntentType.INTEREST: ConversationState.INTERESTED,
        IntentType.OBJECTION: ConversationState.OBJECTION,
        IntentType.MEETING_REQUEST: ConversationState.MEETING_REQUEST,
        IntentType.NOT_INTERESTED: ConversationState.CLOSED_LOST,
        IntentType.UNCLEAR: ConversationState.FOLLOW_UP,
    },
}


@dataclass
class AgentResponse:
    reply: str
    intent: IntentType
    sentiment: str  # positive, neutral, negative
    state: ConversationState
    next_action: str
    should_escalate: bool = False
    meeting_time: str | None = None


class SDRAgent:
    """Autonomous SDR agent that handles conversations."""

    def __init__(self) -> None:
        self._ai = get_ai_gateway()

    async def classify_intent(self, message: str) -> dict[str, Any]:
        """Classify the intent of an incoming message."""
        system_content = (
            "Classify the intent of this B2B sales message. "
            "Return JSON with: "
            "intent (interest/objection/question/meeting_request/"
            "not_interested/out_of_office/wrong_person/unclear), "
            "sentiment (positive/neutral/negative), "
            "key_points (array of main points), "
            "objection_type (if applicable: price/timing/authority/need/none)."
        )
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": message},
        ]

        response = await self._ai.complete(messages, temperature=0.2, response_format="json")
        try:
            return json.loads(response.content)
        except json.JSONDecodeError:
            return {
                "intent": "unclear",
                "sentiment": "neutral",
                "key_points": [],
                "objection_type": "none",
            }

    async def generate_reply(
        self,
        conversation_history: list[dict[str, str]],
        company_context: dict[str, Any],
        current_state: ConversationState,
        intent: IntentType,
    ) -> AgentResponse:
        """Generate an appropriate reply based on conversation state and intent."""

        system_prompt = self._build_system_prompt(current_state, intent, company_context)

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)

        response = await self._ai.complete(messages, temperature=0.5, response_format="json")

        try:
            data = json.loads(response.content)
            new_state = self._get_next_state(current_state, intent)

            return AgentResponse(
                reply=data.get("reply", ""),
                intent=intent,
                sentiment=data.get("sentiment", "neutral"),
                state=new_state,
                next_action=data.get("next_action", ""),
                should_escalate=data.get("should_escalate", False),
                meeting_time=data.get("meeting_time"),
            )
        except json.JSONDecodeError:
            new_state = self._get_next_state(current_state, intent)
            return AgentResponse(
                reply=response.content,
                intent=intent,
                sentiment="neutral",
                state=new_state,
                next_action="manual_review",
                should_escalate=True,
            )

    def _build_system_prompt(
        self,
        state: ConversationState,
        intent: IntentType,
        company_context: dict[str, Any],
    ) -> str:
        company_name = company_context.get("name", "la empresa")
        services = ", ".join(company_context.get("recommended_services", []))
        score = company_context.get("opportunity_score", 0)

        base = (
            f"You are an AI SDR (Sales Development Representative) for a digital services agency.\n"
            f"You are conversing with {company_name} (opportunity score: {score}/100).\n"
            f"Our services: {services}\n\n"
            f"Current state: {state.value}\n"
            f"Incoming intent: {intent.value}\n\n"
        )

        if intent == IntentType.INTEREST:
            return base + (
                "The prospect is interested! Respond enthusiastically but professionally. "
                "Suggest a meeting or demo. Offer specific value propositions.\n"
                "Return JSON: {reply, sentiment, next_action, should_escalate, meeting_time}"
            )
        if intent == IntentType.OBJECTION:
            return base + (
                "The prospect has an objection. Address it empathetically. "
                "Provide evidence, case studies, or alternative solutions. "
                "Don't be pushy — acknowledge their concern and offer solutions.\n"
                "Return JSON: {reply, sentiment, next_action, should_escalate}"
            )
        if intent == IntentType.MEETING_REQUEST:
            return base + (
                "The prospect wants to schedule a meeting! Be enthusiastic. "
                "Suggest 2-3 time options. Ask for their preferred channel.\n"
                "Return JSON: {reply, sentiment, next_action, should_escalate, meeting_time}"
            )
        if intent == IntentType.NOT_INTERESTED:
            return base + (
                "The prospect is not interested. Be respectful. "
                "Ask if there's a better time or if they can refer someone. "
                "Leave the door open.\n"
                "Return JSON: {reply, sentiment, next_action, should_escalate}"
            )
        if intent == IntentType.QUESTION:
            return base + (
                "The prospect has a question. Answer it thoroughly and professionally. "
                "Use the answer to demonstrate expertise and build trust.\n"
                "Return JSON: {reply, sentiment, next_action, should_escalate}"
            )
        return base + (
            "Handle this message professionally. "
            "Return JSON: {reply, sentiment, next_action, should_escalate}"
        )

    def _get_next_state(self, current: ConversationState, intent: IntentType) -> ConversationState:
        transitions = STATE_TRANSITIONS.get(current, {})
        return transitions.get(intent, current)

    async def handle_incoming_message(
        self,
        message: str,
        conversation_history: list[dict[str, str]],
        company_context: dict[str, Any],
        current_state: ConversationState,
    ) -> AgentResponse:
        """Full pipeline: classify intent → generate reply → determine next action."""
        # Step 1: Classify intent
        classification = await self.classify_intent(message)
        intent_str = classification.get("intent", "unclear")
        try:
            intent = IntentType(intent_str)
        except ValueError:
            intent = IntentType.UNCLEAR

        logger.info(
            "sdr_intent_classified",
            intent=intent.value,
            sentiment=classification.get("sentiment"),
        )

        # Step 2: Generate reply
        response = await self.generate_reply(
            conversation_history=conversation_history,
            company_context=company_context,
            current_state=current_state,
            intent=intent,
        )

        # Step 3: Determine escalation
        if intent == IntentType.MEETING_REQUEST:
            response.should_escalate = True
            response.next_action = "Schedule meeting and notify human"

        if current_state == ConversationState.OBJECTION and intent == IntentType.OBJECTION:
            # Double objection = escalate
            response.should_escalate = True
            response.next_action = "Escalate: repeated objection"

        if classification.get("sentiment") == "negative" and intent == IntentType.OBJECTION:
            response.should_escalate = True

        logger.info(
            "sdr_response_generated",
            state=response.state.value,
            should_escalate=response.should_escalate,
        )

        return response


# Singleton
_agent: SDRAgent | None = None


def get_sdr_agent() -> SDRAgent:
    global _agent
    if _agent is None:
        _agent = SDRAgent()
    return _agent
