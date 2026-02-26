"""Dev-only endpoints (e.g. seed demo). Only mounted when AUTH_DEV_MODE=true."""
from fastapi import APIRouter, HTTPException

from app.auth.deps import AdminUser
from app.config import settings

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/seed-demo")
async def seed_demo_endpoint(_: AdminUser) -> dict:
    """
    Run the demo seed (workers, clients, shifts). Admin only.
    Available only when AUTH_DEV_MODE=true.
    """
    if not settings.auth_dev_mode:
        raise HTTPException(status_code=404, detail="Not available")
    from app.utils.seed_demo import seed_demo
    await seed_demo()
    return {
        "ok": True,
        "message": "Demo data loaded. Workers: admin@demo.com, worker-essen@demo.com, worker-duesseldorf@demo.com. Refresh the dashboard.",
    }
