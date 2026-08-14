"""
MCP Server for AI Lead Intelligence Platform.
Exposes lead discovery, enrichment, and contact lookup as MCP tools
so AI agents can search for leads via the Model Context Protocol.
"""

from __future__ import annotations

import asyncio
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from src.infrastructure.enrichment.email_scraper import get_email_scraper
from src.infrastructure.enrichment.hunter_client import get_hunter_client
from src.infrastructure.enrichment.phone_parser import get_phone_parser
from src.infrastructure.enrichment.waterfall import get_waterfall_enrichment

app = Server("lead-intelligence")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List all available MCP tools."""
    return [
        Tool(
            name="search_companies",
            description="Search for companies by location, intent, and radius. Returns matching leads with contact data.",
            inputSchema={
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City/region to search in (e.g., 'Resistencia, Chaco, Argentina')"},
                    "intent": {"type": "string", "description": "What kind of businesses to find (e.g., 'empresas sin web', 'restaurantes')"},
                    "radius_km": {"type": "number", "description": "Search radius in kilometers (default: 10)"},
                    "max_results": {"type": "number", "description": "Maximum results to return (default: 20)"},
                },
                "required": ["location", "intent"],
            },
        ),
        Tool(
            name="find_emails",
            description="Find email addresses for a company domain. Scrapes contact pages, guesses patterns, and checks Hunter.io.",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Company domain (e.g., 'example.com')"},
                },
                "required": ["domain"],
            },
        ),
        Tool(
            name="verify_email",
            description="Verify if an email address is deliverable using Hunter.io verification.",
            inputSchema={
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
            inputSchema={
                "type": "object",
                "properties": {
                    "phone": {"type": "string", "description": "Raw phone number string"},
                    "region": {"type": "string", "description": "ISO country code for parsing (default: 'AR')"},
                },
                "required": ["phone"],
            },
        ),
        Tool(
            name="score_company",
            description="Score a company's opportunity level based on digital presence signals.",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Company website domain"},
                    "has_website": {"type": "boolean", "description": "Whether the company has a website"},
                    "has_ssl": {"type": "boolean", "description": "Whether the site has SSL"},
                    "seo_score": {"type": "number", "description": "SEO score 0-100"},
                    "social_count": {"type": "number", "description": "Number of social profiles"},
                },
                "required": [],
            },
        ),
        Tool(
            name="detect_objection",
            description="Detect if a message contains a sales objection and get response suggestions.",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "The message to analyze"},
                },
                "required": ["message"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle MCP tool calls."""
    if name == "search_companies":
        return await _search_companies(arguments)
    elif name == "find_emails":
        return await _find_emails(arguments)
    elif name == "verify_email":
        return await _verify_email(arguments)
    elif name == "parse_phone":
        return await _parse_phone(arguments)
    elif name == "score_company":
        return await _score_company(arguments)
    elif name == "detect_objection":
        return await _detect_objection(arguments)
    else:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]


async def _search_companies(args: dict[str, Any]) -> list[TextContent]:
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

    result_text = f"""Search Results for: {intent} in {location} (radius: {radius_km}km)
Geocoded: {geo_result.display_name} ({geo_result.latitude}, {geo_result.longitude})
Search Rules: keywords={search_rules.keywords}, industries={search_rules.industries}, signals={search_rules.signals}

Note: Full discovery requires database access. Use the API directly for complete results.
Quick search via web scrapers is available.
"""
    return [TextContent(type="text", text=result_text)]


async def _find_emails(args: dict[str, Any]) -> list[TextContent]:
    """Find emails for a domain using waterfall strategy."""
    domain = args["domain"]

    waterfall = await get_waterfall_enrichment()
    result = await waterfall.enrich(domain)

    if result.email:
        return [TextContent(type="text", text=f"Found: {result.email} (confidence: {result.email_confidence}, sources: {', '.join(result.sources_used)})")]
    else:
        return [TextContent(type="text", text=f"No emails found for {domain} after trying all sources.")]


async def _verify_email(args: dict[str, Any]) -> list[TextContent]:
    """Verify an email address via Hunter.io."""
    email = args["email"]

    hunter = await get_hunter_client()
    if not hunter.enabled:
        return [TextContent(type="text", text="Hunter.io API key not configured. Cannot verify email.")]

    result = await hunter.verify_email(email)
    if result:
        return [TextContent(type="text", text=f"Email: {email}\nStatus: {result['status']}\nScore: {result['score']}\nDisposable: {result['disposable']}\nMX Records: {result['mx_records']}\nSMTP Check: {result['smtp_check']}")]
    else:
        return [TextContent(type="text", text=f"Could not verify {email}")]


async def _parse_phone(args: dict[str, Any]) -> list[TextContent]:
    """Parse and normalize a phone number."""
    phone = args["phone"]
    region = args.get("region", "AR")

    parser = await get_phone_parser(default_region=region)
    result = parser.parse(phone)

    if result:
        return [TextContent(type="text", text=f"Original: {phone}\nE164: {result.number}\nNational: {result.formatted}\nCountry: {result.country_code}\nType: {result.number_type}\nValid: {result.is_valid}")]
    else:
        return [TextContent(type="text", text=f"Could not parse phone number: {phone} (region: {region})")]


async def _score_company(args: dict[str, Any]) -> list[TextContent]:
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
    return [TextContent(type="text", text=f"Score: {breakdown.total}/100\nBreakdown: {breakdown.to_dict()}")]


async def _detect_objection(args: dict[str, Any]) -> list[TextContent]:
    """Detect sales objections in a message."""
    from src.infrastructure.agent.autonomy import get_objection_handler

    handler = get_objection_handler()
    result = handler.detect_objection(args["message"])
    if result:
        return [TextContent(type="text", text=f"Objection detected: {result['type']} (category: {result['category']}, confidence: {result['confidence']})")]
    return [TextContent(type="text", text="No objection detected")]


async def main() -> None:
    """Run the MCP server via stdio transport."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
