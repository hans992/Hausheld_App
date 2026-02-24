"""Application configuration."""
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings loaded from environment."""

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/hausheld"
    env: str = "development"
    debug: bool = True

    # CORS: Railway may send "https://app1.com,https://app2.com"; we normalize to list
    allowed_origins: list[str] = ["*"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()] if v.strip() else ["*"]
        return list(v) if v else ["*"]

    # Auth: JWT (dev simulation or Supabase/Auth0)
    jwt_secret: str = "change-me-in-production-dev-only"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "hausheld-dev"
    # Railway/env may pass "true"/"false" as string; Pydantic coerces to bool
    auth_dev_mode: bool = True  # If True, accept JWTs signed with jwt_secret; no external IdP

    # Optional: Supabase (set auth_dev_mode=False and configure for production)
    supabase_url: str | None = None
    supabase_jwt_secret: str | None = None

    # Optional: Auth0 (alternative to Supabase)
    auth0_domain: str | None = None
    auth0_audience: str | None = None

    # Phase 4: signature storage (mock: local dir; production: S3 bucket path)
    signature_storage_path: str | None = None  # If set, used as base dir for mock storage

    # Phase 5: billing (Entlastungsbetrag)
    hourly_rate_eur: float = 35.0  # Flat rate per hour for cost calculation

    # Phase 6: GDPR – encryption for health data (Fernet key, base64 32 bytes)
    encryption_key: str | None = None  # Set ENCRYPTION_KEY in production (e.g. Fernet.generate_key())

    # Production: AWS Frankfurt for data residency
    # DATABASE_URL should point to RDS in eu-central-1; no cross-region transfer

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
