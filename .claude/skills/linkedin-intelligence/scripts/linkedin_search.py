#!/usr/bin/env python3
"""LinkedIn profile search via public search pages using Playwright."""

import argparse
import asyncio
import json
import random
import sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium", file=sys.stderr)
    sys.exit(1)


async def search_profiles(title: str, company: str | None, location: str | None, limit: int) -> list[dict]:
    parts = [title]
    if company:
        parts.append(company)
    if location:
        parts.append(location)
    query = " ".join(parts)
    url = f"https://www.linkedin.com/search/results/people/?keywords={query.replace(' ', '%20')}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        results = []
        containers = await page.query_selector_all("div.search-result__info, li.reusable-search__result-container, div[data-chameleon-result-urn]")

        for container in containers[:limit]:
            name_el = await container.query_selector("span.entity-result__title-text, span[data-chameleon-result-urn] a span")
            headline_el = await container.query_selector("p.entity-result__summary, div.entity-result__primary-subtitle")
            location_el = await container.query_selector("div.entity-result__secondary-subtitle")
            link_el = await container.query_selector("a[href*='/in/']")

            results.append({
                "name": (await name_el.inner_text()).strip() if name_el else None,
                "headline": (await headline_el.inner_text()).strip() if headline_el else None,
                "location": (await location_el.inner_text()).strip() if location_el else None,
                "linkedin_url": await link_el.get_attribute("href") if link_el else None,
            })

            await page.wait_for_timeout(random.randint(1500, 3000))

        await browser.close()
        return results


def main():
    parser = argparse.ArgumentParser(description="Search LinkedIn profiles")
    parser.add_argument("--title", required=True)
    parser.add_argument("--company")
    parser.add_argument("--location")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--output")
    args = parser.parse_args()

    results = asyncio.run(search_profiles(args.title, args.company, args.location, args.limit))

    output = json.dumps(results, indent=2, ensure_ascii=False)
    if args.output:
        Path(args.output).write_text(output)
        print(f"Saved {len(results)} results to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
