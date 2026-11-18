import unittest

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models.portal_record import PortalRecord


class TestCMSContentEndpoints(unittest.TestCase):
    PASSWORD = "Password123!"

    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        accounts = [
            ("cms-superadmin", "cms-superadmin@test.local",
             "SUPER_ADMIN", "SYSTEM"),
            ("cms-editor", "cms-editor@test.local",
             "ADMIN", "CONTENT_EDITOR"),
            ("cms-ict", "cms-ict@test.local",
             "ADMIN", "ICT_ADMIN"),
        ]

        for user_id, email, role, category in accounts:
            user = {
                "id": user_id,
                "email": email,
                "fullName": role + " CMS Test",
                "passwordHash": generate_password_hash(self.PASSWORD),
                "role": role,
                "category": category,
                "isActive": True,
                "isLocked": False,
                "failedLoginAttempts": 0,
            }
            db.session.add(
                PortalRecord(
                    collection="users",
                    record_key=user_id,
                    payload=user,
                )
            )

        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def headers_for(self, email):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": self.PASSWORD},
        )
        self.assertEqual(
            response.status_code, 200,
            msg=f"Login failed for {email}: {response.get_json()}",
        )
        return {
            "Authorization": "Bearer " + response.get_json()["token"]
        }

    def test_public_can_read_cms_lists(self):
        for endpoint, key in [
            ("/api/v1/cms/leadership", "leadership"),
            ("/api/v1/cms/faqs", "faqs"),
            ("/api/v1/cms/calendar", "calendar"),
        ]:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.get_json()["success"])
            self.assertEqual(response.get_json()[key], [])

    def test_cms_writes_require_authentication(self):
        response = self.client.post(
            "/api/v1/cms/faqs",
            json={"question": "Test question", "answer": "Test answer"},
        )
        self.assertEqual(response.status_code, 401)

    def test_ict_admin_cannot_manage_editorial_content(self):
        headers = self.headers_for("cms-ict@test.local")
        response = self.client.post(
            "/api/v1/cms/faqs",
            headers=headers,
            json={"question": "Test question", "answer": "Test answer"},
        )
        self.assertEqual(response.status_code, 403)

    def test_content_editor_can_create_and_audit_faq(self):
        headers = self.headers_for("cms-editor@test.local")

        response = self.client.post(
            "/api/v1/cms/faqs",
            headers=headers,
            json={
                "question": "What are the admission requirements?",
                "answer": "Applicants must meet the published entry requirements.",
                "status": "DRAFT",
                "order": 1,
            },
        )

        self.assertEqual(response.status_code, 201, response.get_json())
        faq = response.get_json()["record"]
        self.assertEqual(faq["status"], "DRAFT")

        logs = [
            row.payload for row in
            PortalRecord.query.filter_by(collection="auditLogs").all()
            if row.payload.get("action", "").startswith("CMS_CONTENT_")
        ]
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["action"], "CMS_CONTENT_CREATED")
        self.assertEqual(logs[0]["resource"], "CMS_FAQS")

    def test_public_cannot_read_draft_but_can_read_published_faq(self):
        headers = self.headers_for("cms-superadmin@test.local")

        created = self.client.post(
            "/api/v1/cms/faqs",
            headers=headers,
            json={
                "question": "When does registration begin?",
                "answer": "Check the academic calendar.",
                "status": "DRAFT",
            },
        )
        self.assertEqual(created.status_code, 201, created.get_json())
        faq_id = created.get_json()["record"]["id"]

        public_response = self.client.get("/api/v1/cms/faqs")
        self.assertEqual(public_response.status_code, 200)
        self.assertEqual(public_response.get_json()["faqs"], [])

        updated = self.client.put(
            f"/api/v1/cms/faqs/{faq_id}",
            headers=headers,
            json={"status": "PUBLISHED"},
        )
        self.assertEqual(updated.status_code, 200, updated.get_json())

        public_response = self.client.get("/api/v1/cms/faqs")
        self.assertEqual(public_response.status_code, 200)
        self.assertEqual(len(public_response.get_json()["faqs"]), 1)
        self.assertEqual(
            public_response.get_json()["faqs"][0]["id"], faq_id
        )

        deleted = self.client.delete(
            f"/api/v1/cms/faqs/{faq_id}",
            headers=headers,
        )
        self.assertEqual(deleted.status_code, 200, deleted.get_json())

        logs = PortalRecord.query.filter_by(
            collection="auditLogs"
        ).all()
        actions = [
            row.payload["action"] for row in logs
            if row.payload.get("action", "").startswith("CMS_CONTENT_")
        ]

        self.assertEqual(
            actions,
            [
                "CMS_CONTENT_CREATED",
                "CMS_CONTENT_UPDATED",
                "CMS_CONTENT_DELETED",
            ],
        )

    def test_leadership_requires_name_and_title(self):
        headers = self.headers_for("cms-superadmin@test.local")

        response = self.client.post(
            "/api/v1/cms/leadership",
            headers=headers,
            json={"fullName": "Test Leader"},
        )
        self.assertEqual(response.status_code, 400)

    def test_calendar_requires_title(self):
        headers = self.headers_for("cms-superadmin@test.local")

        response = self.client.post(
            "/api/v1/cms/calendar",
            headers=headers,
            json={"description": "A calendar event without a title"},
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
