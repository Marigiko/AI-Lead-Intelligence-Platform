from __future__ import annotations

from datetime import datetime  # noqa: TC003
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )

    # Basic info
    name: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    legal_name: Mapped[str | None] = mapped_column(String(500))
    domain: Mapped[str | None] = mapped_column(String(255), index=True)
    industry: Mapped[str | None] = mapped_column(String(255))
    sub_industry: Mapped[str | None] = mapped_column(String(255))
    employee_count_est: Mapped[int | None] = mapped_column(Integer)
    revenue_est: Mapped[float | None] = mapped_column(Float)
    founded_year: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(1000))

    # Location
    country: Mapped[str | None] = mapped_column(String(100))
    province: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    postal_code: Mapped[str | None] = mapped_column(String(20))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    # Contact
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    whatsapp: Mapped[str | None] = mapped_column(String(50))

    # Social
    linkedin_url: Mapped[str | None] = mapped_column(String(1000))
    facebook_url: Mapped[str | None] = mapped_column(String(1000))
    instagram_url: Mapped[str | None] = mapped_column(String(1000))
    tiktok_url: Mapped[str | None] = mapped_column(String(1000))
    google_maps_url: Mapped[str | None] = mapped_column(String(1000))

    # Google Business
    google_place_id: Mapped[str | None] = mapped_column(String(255))
    google_rating: Mapped[float | None] = mapped_column(Float)
    google_review_count: Mapped[int | None] = mapped_column(Integer)
    google_categories: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    business_hours: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    # Tech stack (populated by enrichment)
    tech_stack: Mapped[list[str]] = mapped_column(JSONB, default=list)
    cms: Mapped[str | None] = mapped_column(String(100))
    hosting: Mapped[str | None] = mapped_column(String(100))
    framework: Mapped[str | None] = mapped_column(String(100))
    analytics_tools: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    has_ssl: Mapped[bool | None] = mapped_column(Boolean)
    has_whatsapp: Mapped[bool | None] = mapped_column(Boolean)
    has_chatbot: Mapped[bool | None] = mapped_column(Boolean)
    has_crm: Mapped[bool | None] = mapped_column(Boolean)
    has_ecommerce: Mapped[bool | None] = mapped_column(Boolean)

    # SEO
    seo_score: Mapped[int | None] = mapped_column(Integer)
    page_speed_mobile: Mapped[int | None] = mapped_column(Integer)
    page_speed_desktop: Mapped[int | None] = mapped_column(Integer)
    core_web_vitals: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    domain_authority: Mapped[int | None] = mapped_column(Integer)
    backlink_count: Mapped[int | None] = mapped_column(Integer)
    domain_age_years: Mapped[int | None] = mapped_column(Integer)

    # Opportunity
    opportunity_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    opportunity_breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    opportunity_analysis: Mapped[str | None] = mapped_column(Text)
    recommended_services: Mapped[list[str] | None] = mapped_column(JSONB)
    estimated_deal_value: Mapped[float | None] = mapped_column(Float)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="discovered", index=True)
    last_enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CompanySource(Base):
    __tablename__ = "company_sources"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(255))
    source_url: Mapped[str | None] = mapped_column(String(1000))
    raw_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    confidence: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
