---
name: linkedin-intelligence
description: LinkedIn profile and company search intelligence for lead generation and prospecting. Use when the user says "search LinkedIn", "find profiles on LinkedIn", "company info", "lead scraping", "prospect on LinkedIn", "hiring on LinkedIn", "people search", "company employees", "LinkedIn search". Builds browser-based search without API tokens.
---

# LinkedIn Intelligence

## Overview

Search LinkedIn profiles and companies for lead generation and prospecting using Playwright browser automation. No LinkedIn API token required — works via public search pages.

## Prerequisites

Install Playwright if not present:
```bash
pip install playwright
playwright install chromium
```

## Profiles & Directories

| File | Content |
|------|---------|
| `scripts/linkedin_search.py` | Search profiles by title/company/location |
| `scripts/linkedin_company.py` | Company page data extraction |
| `references/selectors.md` | LinkedIn DOM selectors reference |

## Core Workflows

### 1. Search Profiles

Run bundled script:
```bash
python scripts/linkedin_search.py --title "Software Engineer" --company "Google" --location "San Francisco" --limit 10
```

Parameters:
- `--title`: Job title to search
- `--company`: Company filter
- `--location`: Geographic filter
- `--limit`: Max results (default 10)
- `--output`: JSON file output path

### 2. Company Intelligence

```bash
python scripts/linkedin_company.py --domain "google.com" --output company_data.json
```

Extracts: name, size, industry, specialties, HQ location, description, follower count, employee count on LinkedIn.

### 3. Profile Detail (Individual)

For deep-dive on a single profile:
```bash
python scripts/linkedin_profile.py --url "https://linkedin.com/in/username" --output profile.json
```

Returns: headline, current role, about, experience, education, skills, certifications.

## Lead Generation Patterns

### Persona-Based Prospecting

For the AI Lead Intelligence Platform's typical personas:
```bash
# Engineering leaders at mid-size companies
python scripts/linkedin_search.py --title "VP Engineering" --location "United States" --limit 20

# CTOs at startups
python scripts/linkedin_search.py --title "CTO" --location "Madrid" --limit 15

# Sales leaders
python scripts/linkedin_search.py --title "Head of Sales" --company "SaaS" --limit 10
```

### Enrichment Pipeline

1. Search → get list of profile URLs
2. For high-priority targets: run `linkedin_profile.py` for full data
3. Output JSON feeds directly into the B2B leads platform (`/leads/enrich` endpoint)
4. Deduplicate by `linkedin_url` in the database

## Anti-Detection

- Add random delays (2-5s) between profile views
- Rotate User-Agent via Playwright
- Limit to ~100 profiles/day per session
- Use authenticated session (cookies) for better access
- Respect `robots.txt` — use for research, not mass scraping

## LinkedIn Search URL Reference

Direct search URL construction (no browser needed for initial results):
```
https://www.linkedin.com/search/results/people/?keywords={title}%20{company}&origin=SWITCH_SEARCH vertical
https://www.linkedin.com/search/results/companies/?keywords={company}&origin=SWITCH_SEARCH vertical
```
