import os
import unittest
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models.portal_record import PortalRecord


class TestProductionSecurity(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        admin = {"id": "admin-1", "email": "admin@example.edu", "fullName": "Test Admin",
                 "passwordHash": generate_password_hash("Long-Strong-Password-123!"), "role": "SUPER_ADMIN",
                 "isActive": True, "isLocked": False, "failedLoginAttempts": 0}
        db.session.add(PortalRecord(collection="users", record_key=admin["id"], payload=admin))
        db.session.add(PortalRecord(collection="students", record_key="student-1", payload={"id":"student-1", "userId":"student-user", "matricNumber":"M-1", "cgpa":4.9}))
        db.session.add(PortalRecord(collection="newsArticles", record_key="draft-1", payload={"id":"draft-1", "title":"Secret Draft", "status":"DRAFT", "content":"private"}))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_security_headers_present(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")

    def test_public_search_does_not_leak_student_records(self):
        response = self.client.get("/api/v1/search?q=student")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["results"]["students"], [])
        self.assertEqual(response.get_json()["results"]["applicants"], [])

    def test_public_cms_does_not_expose_drafts(self):
        response = self.client.get("/api/v1/cms/news")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["articles"], [])
        self.assertEqual(self.client.get("/api/v1/cms/news/draft-1").status_code, 404)

    def test_sensitive_routes_require_authentication(self):
        self.assertEqual(self.client.get("/api/v1/users").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/results").status_code, 401)

    def test_health_checks_database(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json().get("database"), "UP")


if __name__ == "__main__":
    unittest.main()
