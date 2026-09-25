"""Inbound Form API — capture leads from external forms."""

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from src.api.dependencies import DBSession

logger = structlog.get_logger()

router = APIRouter(prefix="/forms", tags=["Inbound"])


class FormSubmission(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    company: str = ""
    message: str = ""
    source: str = "form"
    metadata: dict = {}


class FormConfigRequest(BaseModel):
    name: str = "Default Form"
    redirect_url: str = ""
    webhook_url: str = ""


# Store form configs in memory (in future, DB)
_form_configs: dict[str, dict] = {}


@router.post("/submit")
async def submit_form(data: FormSubmission, request: Request, session: DBSession):
    """Receive a form submission and create a lead."""
    from src.domain.company.models import Company

    # Extract IP for tracking
    client_ip = request.client.host if request.client else "unknown"
    logger.info("form_submission_received", source=data.source, ip=client_ip)

    # Basic validation
    if not data.email and not data.phone:
        raise HTTPException(status_code=400, detail="Email or phone required")

    # Create company from form data
    company_name = data.company or data.name or "Form Submission"
    company = Company(
        tenant_id=None,  # Will be set based on form config
        name=company_name,
        email=data.email or None,
        phone=data.phone or None,
        description=data.message or None,
        status="inbound",
    )

    return {
        "success": True,
        "lead_id": str(company.id),
        "message": "Lead captured successfully",
    }


@router.post("/config")
async def create_form_config(data: FormConfigRequest):
    """Create a new form configuration."""
    import uuid

    form_id = str(uuid.uuid4())[:8]
    _form_configs[form_id] = {
        "id": form_id,
        "name": data.name,
        "redirect_url": data.redirect_url,
        "webhook_url": data.webhook_url,
    }
    return {
        "form_id": form_id,
        "embed_code": '<form action="/api/v1/forms/submit" method="POST">...</form>',
    }


@router.get("/config/{form_id}")
async def get_form_config(form_id: str):
    """Get form configuration."""
    config = _form_configs.get(form_id)
    if not config:
        raise HTTPException(status_code=404, detail="Form not found")
    return config
