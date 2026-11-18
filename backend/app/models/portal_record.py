from datetime import datetime, timezone
from app.extensions import db

class PortalRecord(db.Model):
    """Compatibility persistence for the original portal's domain collections.

    The payload is JSON so existing API data shapes survive the backend migration;
    collection and record keys are indexed and stored transactionally in SQL.
    MySQL is used in production and SQLite for local development/tests.
    """
    __tablename__ = 'portal_records'
    id = db.Column(db.Integer, primary_key=True)
    collection = db.Column(db.String(80), nullable=False, index=True)
    record_key = db.Column(db.String(120), nullable=False)
    payload = db.Column(db.JSON, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc).replace(tzinfo=None), onupdate=datetime.now(timezone.utc).replace(tzinfo=None))
    __table_args__ = (db.UniqueConstraint('collection', 'record_key', name='uq_portal_collection_record'),)
