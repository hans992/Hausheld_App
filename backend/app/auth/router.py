"""Auth routes: dev login (issue JWT) and optional me."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.worker import Worker
from app.auth.deps import get_current_user, CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])


class DevLoginRequest(BaseModel):
    """Body for dev-only login: get a JWT for an existing worker."""

    email: EmailStr
    # Optional: override role in token (DB role is still used for authorization)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int


@router.post("/dev-login", response_model=TokenResponse)
async def dev_login(
    body: DevLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    (Dev only) Issue a JWT for an existing worker by email.
    Only available when auth_dev_mode=True. Use Authorization: Bearer <access_token> on API calls.
    """
    if not settings.auth_dev_mode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dev login disabled",
        )
    result = await db.execute(
        select(Worker).where(Worker.email == body.email).where(Worker.deleted_at.is_(None))
    )
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found with this email",
        )
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {
        "sub": worker.email,
        "email": worker.email,
        "role": worker.role.value,
        "exp": expires,
        "iat": datetime.now(timezone.utc),
        "iss": settings.jwt_issuer,
    }
    raw = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    access_token = raw if isinstance(raw, str) else raw.decode("utf-8")
    return TokenResponse(
        access_token=access_token,
        expires_in_seconds=24 * 3600,
    )


@router.get("/me")
async def me(current_user: CurrentUser):
    """Return the current authenticated worker (for debugging / profile)."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value,
    }
