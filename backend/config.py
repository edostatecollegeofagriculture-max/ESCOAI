import os
from datetime import timedelta
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

BASEDIR = os.path.abspath(os.path.dirname(__file__))


def _db_uri(raw: str, require_tls: bool) -> str:
    raw = (raw or "").strip()
    # Handle PostgreSQL
    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://"):]
    if raw.startswith("postgresql://") and "+psycopg2" not in raw and "+psycopg" not in raw:
        raw = raw.replace("postgresql://", "postgresql+psycopg2://", 1)
    # Handle MySQL / MariaDB
    if raw.startswith("mysql://"):
        raw = raw.replace("mysql://", "mysql+pymysql://", 1)
    if raw.startswith("mariadb://"):
        raw = raw.replace("mariadb://", "mysql+pymysql://", 1)
    if require_tls and raw.startswith("postgresql"):
        parts = urlsplit(raw)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        query.setdefault("sslmode", "require")
        raw = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    return raw


class Config:
    ENABLE_DEV_QUICK_LOGIN = False
    APP_ENVIRONMENT = os.environ.get("APP_ENVIRONMENT", "production")
    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    JWT_ALGORITHM = "HS256"
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "30")))
    JWT_DECODE_LEEWAY = 0
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}
    JSON_SORT_KEYS = False
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_REQUEST_BYTES", 12 * 1024 * 1024))
    PROPAGATE_EXCEPTIONS = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "Lax"


class DevelopmentConfig(Config):
    APP_ENVIRONMENT = "development"
    ENABLE_DEV_QUICK_LOGIN = (
        os.environ.get("ENABLE_DEV_QUICK_LOGIN", "false").strip().lower() == "true"
    )
    DEBUG = False
    SECRET_KEY = os.environ.get("SECRET_KEY", "local-development-only-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "local-development-jwt-only-change-me")
    SQLALCHEMY_DATABASE_URI = _db_uri(
        os.environ.get(
            "DEV_DATABASE_URL",
            f"sqlite:///{os.path.join(BASEDIR, 'edocas_dev.db')}"
        ),
        require_tls=False
    )


class TestingConfig(Config):
    TESTING = True
    SECRET_KEY = "testing-only-secret"
    JWT_SECRET_KEY = "testing-only-jwt-secret-32-bytes-minimum"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    RATELIMIT_ENABLED = False


class ProductionConfig(Config):
    DEBUG = False
    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = _db_uri(os.environ.get("DATABASE_URL", ""), require_tls=os.environ.get("DATABASE_REQUIRE_TLS", "false").lower() != "false")
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300, "pool_size": 5, "max_overflow": 5}
    PREFERRED_URL_SCHEME = "https"
    RATELIMIT_ENABLED = True


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}