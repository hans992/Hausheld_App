"""Auth dependencies: get_current_user, require_admin, RBAC."""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import verify_token
from app.database import get_db
from app.models.worker import Worker, WorkerRole

# Bearer token (recommended for SPAs and mobile)
security = HTTPBearer(auto_error=True)


def get_token_from_bearer(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> str:
    """Extract Bearer token from Authorization header."""
    if not credentials.credentials or not credentials.credentials.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials.strip()


async def get_current_user(
    token: Annotated[str, Depends(get_token_from_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Worker:
    """
    Resolve JWT to the corresponding Worker (by email). Role is taken from DB.
    Raises 401 if token invalid or no matching worker.
    """
    payload = verify_token(token)
    email = (payload.get("email") or payload.get("sub") or "").strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing email/sub",
            headers={"WWW-Authenticate": "Bearer"},
        )
    result = await db.execute(
        select(Worker).where(Worker.email == email).where(Worker.deleted_at.is_(None))
    )
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return worker


def require_admin(
    current_user: Annotated[Worker, Depends(get_current_user)],
) -> Worker:
    """Allow only Admin. Raises 403 for Worker."""
    if current_user.role != WorkerRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# Type aliases for route injection
CurrentUser = Annotated[Worker, Depends(get_current_user)]
AdminUser = Annotated[Worker, Depends(require_admin)]
