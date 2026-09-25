"""
MCP Server for AI Lead Intelligence Platform.
Exposes lead discovery, enrichment, and contact lookup as MCP tools
so AI agents can search for leads via the Model Context Protocol.
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequestParams,
    CallToolResult,
    ContentBlock,
    ListToolsResult,
    PaginatedRequestParams,
    TextContent,
    Tool,
)

from mcp.server import Server
from src.infrastructure.enrichment.hunter_client import get_hunter_client
from src.infrastructure.enrichment.phone_parser import get_phone_parser
from src.infrastructure.enrichment.waterfall import get_waterfall_enrichment

if TYPE_CHECKING:
    from mcp.server.context import ServerRequestContext


def _build_tools() -> list[Tool]:
    """Define all available MCP tools."""
    return [
        Tool(
            name="search_companies",
            description=(
                "Search for companies by location, intent, and radius. "
                "Returns matching leads with contact data."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": (
                            "City/region to search in (e.g., 'Resistencia, Chaco, Argentina')"
                        ),
                    },
                    "intent": {
                        "type": "string",
                        "description": (
                            "What kind of businesses to find "
                            "(e.g., 'empresas sin web', 'restaurantes')"
                        ),
                    },
                    "radius_km": {
                        "type": "number",
                        "description": "Search radius in kilometers (default: 10)",
                    },
                    "max_results": {
                        "type": "number",
                        "description": "Maximum results to return (default: 20)",
                    },
                },
                "required": ["location", "intent"],
            },
        ),
        Tool(
            name="find_emails",
            description=(
                "Find email addresses for a company domain. Scrapes contact pages, "
                "guesses patterns, and checks Hunter.io."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "domain": {
                        "type": "string",
                        "description": "Company domain (e.g., 'example.com')",
                    },
                },
                "required": ["domain"],
            },
        ),
        Tool(
            name="verify_email",
            description=("Verify if an email address is deliverable using Hunter.io verification."),
            input_schema={
                "type": "object",
                "properties": {
                    "email": {"type": "string", "description": "Email address to verify"},
                },
                "required": ["email"],
            },
        ),
        Tool(
            name="parse_phone",
            description="Parse and normalize a phone number to E164 format.",
            input_schema={
                "type": "object",
                "properties": {
                    "phone": {"type": "string", "description": "Raw phone number string"},
                    "region": {
                        "type": "string",
                        "description": "ISO country code for parsing (default: 'AR')",
                    },
                },
                "required": ["phone"],
            },
        ),
        Tool(
            name="score_company",
            description=("Score a company's opportunity level based on digital presence signals."),
            input_schema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Company website domain"},
                    "has_website": {
                        "type": "boolean",
                        "description": "Whether the company has a website",
                    },
                    "has_ssl": {"type": "boolean", "description": "Whether the site has SSL"},
                    "seo_score": {"type": "number", "description": "SEO score 0-100"},
                    "social_count": {
                        "type": "number",
                        "description": "Number of social profiles",
                    },
                },
                "required": [],
            },
        ),
        Tool(
            name="detect_objection",
            description=(
                "Detect if a message contains a sales objection and get response suggestions."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "The message to analyze"},
                },
                "required": ["message"],
            },
        ),
    ]


async def _list_tools(
    _ctx: ServerRequestContext[Any],
    _params: PaginatedRequestParams | None,
) -> ListToolsResult:
    """List all available MCP tools."""
    return ListToolsResult(tools=_build_tools())


async def _call_tool(
    _ctx: ServerRequestContext[Any],
    params: CallToolRequestParams,
) -> CallToolResult:
    """Handle MCP tool calls."""
    name = params.name
    arguments: dict[str, Any] = dict(params.arguments or {})
    content: list[ContentBlock]

    if name == "search_companies":
        content = await _search_companies(arguments)
    elif name == "find_emails":
        content = await _find_emails(arguments)
    elif name == "verify_email":
        content = await _verify_email(arguments)
    elif name == "parse_phone":
        content = await _parse_phone(arguments)
    elif name == "score_company":
        content = await _score_company(arguments)
    elif name == "detect_objection":
        content = await _detect_objection(arguments)
    else:
        content = [TextContent(type="text", text=f"Unknown tool: {name}")]
    return CallToolResult(content=content)


app = Server("lead-intelligence", on_list_tools=_list_tools, on_call_tool=_call_tool)


async def _search_companies(args: dict[str, Any]) -> list[ContentBlock]:
    """Search for companies via discovery pipeline."""
    location = args["location"]
    intent = args["intent"]
    radius_km = args.get("radius_km", 10)
    max_results = args.get("max_results", 20)

    # Use geocoding to get coordinates
    from src.infrastructure.scraping.geocoding import get_geocoding_service

    geocoding = get_geocoding_service()
    geo_result = await geocoding.geocode(location)

    if not geo_result:
        return [TextContent(type="text", text=f"Could not geocode location: {location}")]

    # Use intent parser to understand search
    from src.infrastructure.scraping.intent_parser import get_intent_parser

    intent_parser = get_intent_parser()
    search_rules = intent_parser.parse(intent)

    result_text = (
        f"Search Results for: {intent} in {location} "
        f"(radius: {radius_km}km, limit: {max_results})\n"
        f"Geocoded: {geo_result.display_name} ({geo_result.latitude}, {geo_result.longitude})\n"
        f"Search Rules: keywords={search_rules.keywords}, "
        f"industries={search_rules.industries}, signals={search_rules.signals}\n"
        "\n"
        "Note: Full discovery requires database access. "
        "Use the API directly for complete results.\n"
        "Quick search via web scrapers is available.\n"
    )
    return [TextContent(type="text", text=result_text)]


async def _find_emails(args: dict[str, Any]) -> list[ContentBlock]:
    """Find emails for a domain using waterfall strategy."""
    domain = args["domain"]

    waterfall = await get_waterfall_enrichment()
    result = await waterfall.enrich(domain)

    if result.email:
        sources = ", ".join(result.sources_used)
        return [
            TextContent(
                type="text",
                text=f"Found: {result.email} (confidence: {result.email_confidence}, "
                f"sources: {sources})",
            )
        ]
    return [
        TextContent(type="text", text=f"No emails found for {domain} after trying all sources.")
    ]


async def _verify_email(args: dict[str, Any]) -> list[ContentBlock]:
    """Verify an email address via Hunter.io."""
    email = args["email"]

    hunter = await get_hunter_client()
    if not hunter.enabled:
        return [
            TextContent(
                type="text",
                text="Hunter.io API key not configured. Cannot verify email.",
            )
        ]

    result = await hunter.verify_email(email)
    if result:
        return [
            TextContent(
                type="text",
                text=f"Email: {email}\nStatus: {result['status']}\nScore: {result['score']}\n"
                f"Disposable: {result['disposable']}\nMX Records: {result['mx_records']}\n"
                f"SMTP Check: {result['smtp_check']}",
            )
        ]
    return [TextContent(type="text", text=f"Could not verify {email}")]


async def _parse_phone(args: dict[str, Any]) -> list[ContentBlock]:
    """Parse and normalize a phone number."""
    phone = args["phone"]
    region = args.get("region", "AR")

    parser = await get_phone_parser(default_region=region)
    result = parser.parse(phone)

    if result:
        return [
            TextContent(
                type="text",
                text=f"Original: {phone}\nE164: {result.number}\nNational: {result.formatted}\n"
                f"Country: {result.country_code}\nType: {result.number_type}\n"
                f"Valid: {result.is_valid}",
            )
        ]
    return [
        TextContent(
            type="text",
            text=f"Could not parse phone number: {phone} (region: {region})",
        )
    ]


async def _score_company(args: dict[str, Any]) -> list[ContentBlock]:
    """Score a company's opportunity level."""
    from src.application.scoring.engine import get_scoring_engine

    engine = get_scoring_engine()
    data = {
        "domain": args.get("domain"),
        "has_ssl": args.get("has_ssl"),
        "seo_score": args.get("seo_score"),
        "social_count": args.get("social_count"),
    }
    breakdown = engine.calculate_score(data)
    return [
        TextContent(
            type="text", text=f"Score: {breakdown.total}/100\nBreakdown: {breakdown.to_dict()}"
        )
    ]


async def _detect_objection(args: dict[str, Any]) -> list[ContentBlock]:
    """Detect sales objections in a message."""
    from src.infrastructure.agent.autonomy import get_objection_handler

    handler = get_objection_handler()
    result = handler.detect_objection(args["message"])
    if result:
        return [
            TextContent(
                type="text",
                text=f"Objection detected: {result['type']} "
                f"(category: {result['category']}, confidence: {result['confidence']})",
            )
        ]
    return [TextContent(type="text", text="No objection detected")]


async def main() -> None:
    """Run the MCP server via stdio transport."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
