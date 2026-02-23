"""Helpers for PostGIS geometry in API responses."""
from app.schemas.worker import PointSchema


def point_from_geometry(geom) -> PointSchema | None:
    """Build PointSchema from GeoAlchemy2 WKBElement (Point) or None."""
    if geom is None:
        return None
    try:
        # GeoAlchemy2 returns WKBElement; use .x and .y when available (Point)
        return PointSchema(longitude=float(geom.x), latitude=float(geom.y))
    except (AttributeError, TypeError):
        return None
