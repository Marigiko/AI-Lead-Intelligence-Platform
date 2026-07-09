"""
Seed script to populate the database with sample companies for the Argentine/Chaco region.
Run: docker compose exec backend uv run python -m data.seeds.seed_companies
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))

from src.core.database import get_engine, get_session_factory, Base
from src.domain.company.models import Company, CompanySource
from src.domain.tenant.models import Tenant
from src.domain.user.models import User
from src.core.security import hash_password


SEED_COMPANIES = [
    {
        "name": "Distribuidora El Norte",
        "domain": "distribuidoraelnorte.com",
        "industry": "Distribución",
        "sub_industry": "Alimentos y bebidas",
        "city": "Resistencia",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-123456",
        "email": "info@distribuidoraelnorte.com",
        "latitude": -27.4517,
        "longitude": -59.0003,
        "tech_stack": [],
        "has_ssl": False,
        "has_whatsapp": False,
        "has_chatbot": False,
        "seo_score": 25,
        "page_speed_mobile": 35,
        "opportunity_score": 78,
        "status": "discovered",
    },
    {
        "name": "Constructora Chaco SRL",
        "domain": None,
        "industry": "Construcción",
        "sub_industry": "Edificación residencial",
        "city": "Resistencia",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-654321",
        "latitude": -27.4520,
        "longitude": -59.0010,
        "tech_stack": [],
        "opportunity_score": 95,
        "status": "discovered",
    },
    {
        "name": "Estudio Jurídico Moreno & Asoc.",
        "domain": "moreno-abogados.com.ar",
        "industry": "Legal",
        "sub_industry": "Derecho empresarial",
        "city": "Resistencia",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-789012",
        "email": "contacto@moreno-abogados.com.ar",
        "latitude": -27.4510,
        "longitude": -58.9995,
        "tech_stack": ["WordPress", "PHP 7.4"],
        "has_ssl": True,
        "has_whatsapp": False,
        "has_chatbot": False,
        "seo_score": 32,
        "page_speed_mobile": 42,
        "page_speed_desktop": 65,
        "opportunity_score": 82,
        "status": "discovered",
    },
    {
        "name": "Hotel Cacique Calchaquí",
        "domain": "caciquecalchaqui.com",
        "industry": "Hotelería",
        "sub_industry": "Hotel boutique",
        "city": "Resistencia",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-345678",
        "email": "reservas@caciquecalchaqui.com",
        "latitude": -27.4505,
        "longitude": -59.0020,
        "tech_stack": ["WordPress", "WooCommerce"],
        "has_ssl": True,
        "has_whatsapp": True,
        "google_rating": 4.2,
        "google_review_count": 89,
        "seo_score": 45,
        "opportunity_score": 65,
        "status": "discovered",
    },
    {
        "name": "Clínica Dental Sonrisa",
        "domain": None,
        "industry": "Salud",
        "sub_industry": "Odontología",
        "city": "Corrientes",
        "province": "Corrientes",
        "country": "Argentina",
        "phone": "+54 3794-111222",
        "latitude": -27.4698,
        "longitude": -58.8349,
        "tech_stack": [],
        "google_rating": 4.8,
        "google_review_count": 156,
        "opportunity_score": 88,
        "status": "discovered",
    },
    {
        "name": "Agencia de Marketing Digital Creativa",
        "domain": "creativamarketing.com.ar",
        "industry": "Marketing",
        "sub_industry": "Marketing digital",
        "city": "Resistencia",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-999888",
        "email": "hola@creativamarketing.com.ar",
        "latitude": -27.4512,
        "longitude": -59.0008,
        "tech_stack": ["Next.js", "React", "Tailwind CSS", "Vercel"],
        "has_ssl": True,
        "has_whatsapp": True,
        "has_chatbot": True,
        "seo_score": 78,
        "page_speed_mobile": 92,
        "page_speed_desktop": 98,
        "opportunity_score": 35,
        "status": "enriched",
    },
    {
        "name": "Transporte Pesado del Norte",
        "domain": None,
        "industry": "Logística",
        "sub_industry": "Transporte de carga",
        "city": "Fontana",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-555666",
        "latitude": -27.4200,
        "longitude": -59.0260,
        "opportunity_score": 91,
        "status": "discovered",
    },
    {
        "name": "Restaurante La Parrilla del Norte",
        "domain": "laparrilladelnorte.com.ar",
        "industry": "Gastronomía",
        "sub_industry": "Restaurante",
        "city": "Resistencia",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-222333",
        "latitude": -27.4515,
        "longitude": -59.0001,
        "tech_stack": ["WordPress"],
        "has_ssl": False,
        "google_rating": 4.0,
        "google_review_count": 234,
        "seo_score": 20,
        "page_speed_mobile": 28,
        "opportunity_score": 85,
        "status": "discovered",
    },
    {
        "name": "Instituto de Educación Secundaria",
        "domain": None,
        "industry": "Educación",
        "sub_industry": "Instituto terciario",
        "city": "Resistencia",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-444555",
        "latitude": -27.4508,
        "longitude": -59.0015,
        "opportunity_score": 72,
        "status": "discovered",
    },
    {
        "name": "Frigorífico Chaco S.A.",
        "domain": "frigorificochaco.com.ar",
        "industry": "Alimentos",
        "sub_industry": "Frigorífico",
        "city": "Resistencia",
        "province": "Chaco",
        "country": "Argentina",
        "phone": "+54 3644-777888",
        "email": "exportaciones@frigorificochaco.com.ar",
        "latitude": -27.4525,
        "longitude": -58.9998,
        "tech_stack": ["Drupal", "PHP"],
        "has_ssl": True,
        "seo_score": 40,
        "page_speed_mobile": 38,
        "page_speed_desktop": 55,
        "opportunity_score": 70,
        "status": "discovered",
    },
]

SEED_TENANT = {
    "name": "Demo Agency",
    "slug": "demo-agency",
    "plan": "pro",
}

SEED_USER = {
    "email": "admin@demo.com",
    "full_name": "Admin User",
    "role": "owner",
}


async def seed():
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = get_session_factory()
    async with factory() as session:
        # Create tenant
        tenant = Tenant(**SEED_TENANT)
        session.add(tenant)
        await session.flush()

        # Create user
        user = User(
            tenant_id=tenant.id,
            hashed_password=hash_password("demo1234"),
            **SEED_USER,
        )
        session.add(user)

        # Create companies
        for data in SEED_COMPANIES:
            company = Company(tenant_id=tenant.id, **data)
            session.add(company)

        await session.commit()
        print(f"Seeded: 1 tenant, 1 user, {len(SEED_COMPANIES)} companies")
        print(f"Login: admin@demo.com / demo1234")


if __name__ == "__main__":
    asyncio.run(seed())
