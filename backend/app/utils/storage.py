"""
Mock storage for digital signatures (Phase 4).
In production, replace with AWS S3 or similar; this writes to local files and returns a storage key.
"""
import base64
import re
import uuid
from pathlib import Path

from app.config import settings

# Base directory for mock storage (default: backend/storage/signatures)
_base = Path(__file__).resolve().parent.parent.parent
_default = _base / "storage" / "signatures"
STORAGE_DIR: Path = Path(settings.signature_storage_path) if settings.signature_storage_path else _default


def _ensure_storage_dir() -> Path:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STORAGE_DIR


def save_signature(shift_id: int, signature_base64: str) -> str:
    """
    Save a base64-encoded signature image to mock storage (file system).
    Returns a unique storage key suitable for storing in shift.signature_storage_key
    (e.g. 'signatures/2025/02/42_abc123.png'). In production, upload to S3 and return the S3 key.

    :param shift_id: Shift id (for path organisation).
    :param signature_base64: Base64 image string, optionally with data URL prefix (data:image/png;base64,...).
    :return: Unique storage key (e.g. signatures/2025/02/42_<uuid>.png).
    """
    # Strip data URL prefix if present
    raw = signature_base64.strip()
    if raw.startswith("data:"):
        match = re.match(r"data:image/(\w+);base64,", raw, re.IGNORECASE)
        if match:
            raw = raw[match.end() :]
            ext = match.group(1).lower()
            if ext == "jpeg":
                ext = "jpg"
        else:
            raw = re.sub(r"^data:[^;]+;base64,", "", raw, flags=re.IGNORECASE)
            ext = "png"
    else:
        ext = "png"
    try:
        data = base64.b64decode(raw, validate=True)
    except Exception as e:
        raise ValueError(f"Invalid base64 signature data: {e}") from e
    if len(data) > 5 * 1024 * 1024:  # 5 MB max
        raise ValueError("Signature image too large")
    _ensure_storage_dir()
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    subdir = STORAGE_DIR / str(now.year) / f"{now.month:02d}"
    subdir.mkdir(parents=True, exist_ok=True)
    name = f"{shift_id}_{uuid.uuid4().hex[:12]}.{ext}"
    path = subdir / name
    path.write_bytes(data)
    # Return key as relative path for portability (e.g. S3 key)
    key = f"signatures/{now.year}/{now.month:02d}/{name}"
    return key
