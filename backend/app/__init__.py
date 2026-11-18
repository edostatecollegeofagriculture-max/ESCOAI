import os
from flask import Flask, jsonify, request
from sqlalchemy import text
from werkzeug.middleware.proxy_fix import ProxyFix
from app.extensions import db, migrate, jwt, cors, limiter
from config import config_by_name


def create_app(config_name=None):
    config_name = config_name or os.environ.get("FLASK_CONFIG", "development")
    config_class = config_by_name.get(config_name)
    if config_class is None:
        raise RuntimeError(f"Unsupported FLASK_CONFIG: {config_name}")

    app = Flask(__name__)
    app.config.from_object(config_class)
    app.config["APP_ENVIRONMENT"] = config_name

    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        raise RuntimeError("DATABASE_URL must be configured for the selected environment.")
    if config_name == "production":
        if not app.config.get("SECRET_KEY") or len(app.config["SECRET_KEY"]) < 32:
            raise RuntimeError("Production SECRET_KEY must be a unique random value of at least 32 characters.")
        if not app.config.get("JWT_SECRET_KEY") or len(app.config["JWT_SECRET_KEY"]) < 32:
            raise RuntimeError("Production JWT_SECRET_KEY must be a separate random value of at least 32 characters.")
        if app.config["SECRET_KEY"] == app.config["JWT_SECRET_KEY"]:
            raise RuntimeError("Production SECRET_KEY and JWT_SECRET_KEY must be different values.")
        if any(str(app.config[key]).lower().startswith(("replace-", "change-me", "your-")) for key in ("SECRET_KEY", "JWT_SECRET_KEY")):
            raise RuntimeError("Replace placeholder secrets with unique randomly generated production secrets.")
        database_uri = app.config["SQLALCHEMY_DATABASE_URI"]
        if not database_uri.startswith("mysql+pymysql://"):
            raise RuntimeError("Production must use MySQL via mysql+pymysql:// DATABASE_URL.")
        limiter_store = os.environ.get("RATELIMIT_STORAGE_URI", "").strip()
        if not limiter_store or limiter_store.startswith("memory://"):
            raise RuntimeError("Production requires a shared Redis-compatible RATELIMIT_STORAGE_URI; memory rate limiting is not production-safe.")
        # Render terminates HTTPS at its edge proxy; trust only the single known proxy hop.
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)

    raw_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173" if config_name != "production" else "")
    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]
    if config_name == "production" and (not origins or "*" in origins or any(not x.startswith("https://") for x in origins)):
        raise RuntimeError("Production CORS_ORIGINS must contain exact HTTPS frontend origins; wildcards are not allowed.")
    cors.init_app(app, resources={r"/api/*": {"origins": origins, "max_age": 600}}, supports_credentials=False)

    from app.models import portal_record
    from app.models.portal_record import PortalRecord
    from flask_jwt_extended import get_jwt_identity

    @jwt.token_in_blocklist_loader
    def reject_inactive_or_missing_users(_jwt_header, jwt_payload):
        """Re-check account status on every authenticated request so deactivation takes effect immediately."""
        identity = str(jwt_payload.get("sub", ""))
        jti = jwt_payload.get("jti")
        try:
            # Reject tokens that have been explicitly revoked during logout.
            if jti and PortalRecord.query.filter_by(
                collection="jwtBlocklist",
                record_key=str(jti)
            ).first():
                return True

            row = PortalRecord.query.filter_by(collection="users", record_key=identity).first()
            if row is None:
                return True
            user = row.payload or {}
            return not user.get("isActive", True) or bool(user.get("isLocked", False))
        except Exception:
            db.session.rollback()
            app.logger.exception("Could not validate JWT account status")
            return True

    from app.routes.portal import portal_bp
    from app.routes.uploads import uploads_bp
    app.register_blueprint(portal_bp)
    app.register_blueprint(uploads_bp)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        if config_name == "production":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        if request.path.startswith("/api/v1/auth/") or request.path.startswith("/api/v1/users"):
            response.headers["Cache-Control"] = "no-store, max-age=0"
            response.headers["Pragma"] = "no-cache"
        return response

    @app.get("/api/health")
    def health_check():
        try:
            db.session.execute(text("SELECT 1"))
            db.session.rollback()
            return jsonify(status="UP", service="EDOCASTI Flask REST API", database="UP"), 200
        except Exception:
            db.session.rollback()
            app.logger.exception("Health check database probe failed")
            return jsonify(status="DEGRADED", service="EDOCASTI Flask REST API", database="DOWN"), 503

    @app.get("/")
    def root():
        return jsonify(service="EDOCASTI Flask REST API", status="UP", health="/api/health"), 200

    @app.errorhandler(400)
    def bad_request(_):
        return jsonify(success=False, message="Bad request."), 400

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(success=False, message="Resource not found."), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return jsonify(success=False, message="Method not allowed."), 405

    @app.errorhandler(413)
    def request_too_large(_):
        return jsonify(success=False, message="Request exceeds the allowed size."), 413

    @app.errorhandler(429)
    def rate_limited(_):
        return jsonify(success=False, message="Too many requests. Please wait before trying again."), 429

    @app.errorhandler(500)
    def server_error(_):
        db.session.rollback()
        app.logger.exception("Unhandled application error")
        return jsonify(success=False, message="An internal server error occurred."), 500

    return app


