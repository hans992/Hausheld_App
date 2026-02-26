"""Geo API: heatmap GeoJSON (shift density by client location)."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import CurrentUser
from app.database import get_db
from app.models.client import Client
from app.models.shift import Shift

router = APIRouter(tags=["geo"])


@router.get("/heatmap")
async def get_heatmap(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    GeoJSON FeatureCollection of client locations with weight = shift count at that location.
    Only clients with address_location set and not soft-deleted are included.
    """
    # Clients with location, joined to shift count (including 0)
    q = (
        select(Client, func.count(Shift.id).label("shift_count"))
        .outerjoin(Shift, (Shift.client_id == Client.id) & (Shift.deleted_at.is_(None)))
        .where(Client.address_location.isnot(None))
        .where(Client.deleted_at.is_(None))
        .group_by(Client.id)
    )
    result = await db.execute(q)
    rows = result.all()

    features = []
    for client, shift_count in rows:
        geom = client.address_location
        if geom is None:
            continue
        try:
            lon, lat = float(geom.x), float(geom.y)
        except (AttributeError, TypeError):
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"weight": shift_count},
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }
