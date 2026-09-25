"""
Local Directory scraper — generates realistic local business data for development/demo.
In production, this would be replaced by real API calls to Google Places, Yelp, etc.
"""

from __future__ import annotations

import random
from typing import Any

import structlog

from src.infrastructure.scraping.engine import ScrapeResult
from src.infrastructure.scraping.plugins.base import BaseScraper, ScraperConfig

logger = structlog.get_logger()


# Realistic Argentine business data for demo
BUSINESS_TEMPLATES = {
    "restaurantes": [
        (
            "Parrilla",
            [
                "La Parrilla del Norte",
                "El Fogón de los Llanos",
                "Parrilla Don Pedro",
                "Lo de Charly",
                "Parrilla El 80",
            ],
        ),
        (
            "Pizzería",
            ["Pizzería Napoli", "Pizza Lo César", "Don Antonio Pizzas", "Pizzería La Popular"],
        ),
        ("Café", ["Café Martínez", "Bonafide Café", "Café del Centro", "Confitería La Paz"]),
        ("Rotisería", ["Lo de Tito", "Rotisería El Buen Gusto", "Lo de Nacho"]),
    ],
    "hoteles": [
        (
            "Hotel",
            [
                "Hotel Mayorazgo",
                "Amerian Resistencia Park Hotel",
                "Hotel Las Marias",
                "Residencial Gran Hotel",
            ],
        ),
        ("Hostería", ["Hostería El Descanso", "La Posta Hostería"]),
    ],
    "clinicas": [
        (
            "Clínica",
            ["Clínica del Norte", "Clínica Modelo", "Sanatorio Resistencia", "Clínica_PRIVADA"],
        ),
        (
            "Odontología",
            ["Odontología Integral", "Dental Care", "Sonrisa Dental", "Centro Odontológico Chaco"],
        ),
        ("Laboratorio", ["Laboratorio Bioquímico", "Análisis Clínicos del Norte"]),
    ],
    "supermercados": [
        (
            "Supermercado",
            [
                "Supermercado La Reina",
                "Carrefour Resistencia",
                "Coto Supermercado",
                "Día Supermercado",
            ],
        ),
        ("Despensa", ["Despensa Don Juan", "Almacén de Barrio"]),
    ],
    "talleres": [
        ("Taller Mecánico", ["Taller Mecánico del Norte", "Electro Auto", "Gomería El Amigo"]),
        ("Electricista", ["Electricidad del Centro", "Elektro Servicios"]),
    ],
    "general": [
        (
            "Servicios",
            ["Correo Argentino", "Rapipago", "Pago Fácil", "Banco Nación", "Banco del Chaco"],
        ),
        (
            "Comercios",
            [
                "Librería El Ateneo",
                "Ferretería El Tornillo",
                "Zapatería Atlas",
                "Mercería Creaciones",
            ],
        ),
    ],
}


class LocalDirectoryScraper(BaseScraper):
    """Local directory scraper for development — generates realistic business data."""

    source_name = "local_directory"
    source_label = "Directorio Local"
    requires_browser = False
    default_rpm = 100

    async def scrape(
        self,
        context: Any,  # noqa: ARG002
        config: ScraperConfig,
    ) -> list[ScrapeResult]:
        results: list[ScrapeResult] = []

        if config.latitude is None or config.longitude is None:
            logger.warning("local_directory_no_coordinates")
            return results

        try:
            # Determine which business types to search based on query
            query_lower = config.query.lower()
            selected_templates = []

            keyword_mapping = {
                "restaurantes": ["restaurantes"],
                "gastronomia": ["restaurantes"],
                "restaurant": ["restaurantes"],
                "comida": ["restaurantes"],
                "hoteles": ["hoteles"],
                "hotel": ["hoteles"],
                "hospedaje": ["hoteles"],
                "clinicas": ["clinicas"],
                "clinica": ["clinicas"],
                "salud": ["clinicas"],
                "dental": ["clinicas"],
                "odontologia": ["clinicas"],
                "supermercados": ["supermercados"],
                "supermercado": ["supermercados"],
                "comercio": ["general", "supermercados"],
                "talleres": ["talleres"],
                "taller": ["talleres"],
                "mecanica": ["talleres"],
            }

            matched = False
            for keyword, categories in keyword_mapping.items():
                if keyword in query_lower:
                    for cat in categories:
                        if cat in BUSINESS_TEMPLATES:
                            selected_templates.extend(BUSINESS_TEMPLATES[cat])
                    matched = True

            # If no match, use general + some random categories
            if not matched:
                selected_templates = BUSINESS_TEMPLATES["general"]
                # Add 2 random categories
                random_cats = random.sample(
                    list(BUSINESS_TEMPLATES.keys()), min(2, len(BUSINESS_TEMPLATES))
                )
                for cat in random_cats:
                    selected_templates.extend(BUSINESS_TEMPLATES[cat])

            # Generate results
            for category, names in selected_templates:
                for name in names:
                    # Add location suffix for some businesses
                    location_suffix = ""
                    if config.location and random.random() > 0.7:
                        parts = config.location.split(",")
                        if len(parts) > 0:
                            location_suffix = f" {parts[0].strip()}"

                    full_name = f"{name}{location_suffix}"

                    # Generate realistic coordinates near search center
                    lat_offset = random.uniform(-0.02, 0.02)
                    lng_offset = random.uniform(-0.02, 0.02)
                    lat = config.latitude + lat_offset
                    lng = config.longitude + lng_offset

                    # Generate realistic phone (Argentine format)
                    area_codes = ["3644", "362", "379", "388"]
                    area_code = random.choice(area_codes)
                    phone = f"+54 {area_code}-{random.randint(100000, 999999)}"

                    # Generate domain for some businesses
                    domain = None
                    if random.random() > 0.5:
                        clean_name = (
                            name.lower().replace(" ", "").replace("ó", "o").replace("ñ", "n")
                        )
                        domains = [f"{clean_name}.com.ar", f"{clean_name}.com"]
                        domain = random.choice(domains)

                    # Generate email for some businesses
                    email = None
                    if random.random() > 0.6:
                        email = f"info@{domain}" if domain else None

                    # Generate rating
                    google_rating = (
                        round(random.uniform(3.0, 4.9), 1) if random.random() > 0.3 else None
                    )
                    google_review_count = random.randint(5, 200) if google_rating else None

                    result = ScrapeResult(
                        source="local_directory",
                        raw_data={"name": full_name, "category": category},
                        normalized_data={
                            "name": full_name,
                            "domain": domain,
                            "industry": category,
                            "phone": phone,
                            "email": email,
                            "latitude": lat,
                            "longitude": lng,
                            "city": config.location.split(",")[0].strip()
                            if config.location
                            else None,
                            "province": config.location.split(",")[1].strip()
                            if config.location and len(config.location.split(",")) > 1
                            else None,
                            "country": "Argentina",
                            "google_rating": google_rating,
                            "google_review_count": google_review_count,
                            "website": domain,
                        },
                        confidence=0.85 if domain else 0.7,
                        source_id=f"local_{random.randint(10000, 99999)}",
                        source_url=domain or "",
                    )
                    results.append(result)

        except Exception as e:
            logger.error("local_directory_error", error=str(e))

        logger.info("local_directory_completed", count=len(results))
        return results
