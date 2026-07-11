#!/usr/bin/env python3
"""Extract LinkedIn company page data via Playwright."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("ERROR: playwright not installed", file=sys.stderr)
    sys.exit(1)


async def get_company(domain: str) -> dict:
    url = f"https://www.linkedin.com/company/{domain.split('.')[0]}"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        )
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2500)

        name = (await page.title()).replace(" | LinkedIn", "").strip()
        desc_el = await page.query_selector("p[data-test-id='about-us__description'], .org-overview__short-description")
        desc = (await desc_el.inner_text()).strip() if desc_el else ""
        size_el = await page.query_selector("a.org-about-company-module__link, span.org-about-company-module__company-size-definition-text")
        size = (await size_el.inner_text()).strip() if size_el else ""
        industry_el = await page.query_selector("div.org-top-card-summary-info-list__info-item")
        industry = (await industry_el.inner_text()).strip() if industry_el else ""

        await browser.close()
        return {
            "name": name,
            "domain": domain,
            "linkedin_url": url,
            "description": desc,
            "company_size": size,
            "industry": industry,
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()

    data = asyncio.run(get_company(args.domain))
    out = json.dumps(data, indent=2, ensure_ascii=False)
    if args.output:
        Path(args.output).write_text(out)
    else:
        print(out)


if __name__ == "__main__":
    main()
