"""JWT verification: dev (HS256) or Supabase/Auth0."""
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from jose import jwt
from jose.exceptions import JWTError

from app.config import settings


def verify_token(token: str) -> dict[str, Any]:
    """
    Verify JWT and return payload (sub, email, role).
    In auth_dev_mode uses jwt_secret; otherwise can use Supabase/Auth0 (extensible).
    """
    if not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        if settings.auth_dev_mode:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                options={"verify_aud": False},
            )
            # Normalize: prefer email for lookup
            if "email" not in payload and "sub" in payload:
                payload["email"] = payload["sub"]
            return payload
        if settings.supabase_url and settings.supabase_jwt_secret:
            # Supabase JWTs are signed with the project's JWT secret
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=[settings.jwt_algorithm],
                audience="authenticated",
                options={"verify_aud": True},
            )
            if "email" not in payload and "sub" in payload:
                payload["email"] = payload.get("email") or payload.get("sub")
            return payload
        if settings.auth0_domain and settings.auth0_audience:
            # Auth0: verify with JWKS (would need requests + jwks client in production)
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Auth0 integration: configure JWKS endpoint",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured: set auth_dev_mode=True or Supabase/Auth0",
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
