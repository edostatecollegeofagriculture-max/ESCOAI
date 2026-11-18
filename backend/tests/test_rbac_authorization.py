import unittest
import inspect
from types import SimpleNamespace
from unittest.mock import patch

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models.portal_record import PortalRecord


class TestRoleBasedAuthorization(unittest.TestCase):

    PASSWORD = "Password123!"

    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.accounts = {
            "registrar": ("rbac-registrar", "registrar@rbac.test", "REGISTRAR"),
            "lecturer": ("rbac-lecturer", "lecturer@rbac.test", "LECTURER"),
            "bursar": ("rbac-bursar", "bursar@rbac.test", "BURSAR"),
            "hod": ("rbac-hod", "hod@rbac.test", "HOD"),
            "admissions": ("rbac-admissions", "admissions@rbac.test", "ADMISSIONS_OFFICER"),
            "ict_admin": ("rbac-ict-admin", "ict-admin@rbac.test", "ICT_ADMIN"),
            "superadmin": ("rbac-superadmin", "superadmin@rbac.test", "SUPER_ADMIN"),
        }

        for account_id, email, role in self.accounts.values():
            user = {
                "id": account_id,
                "email": email,
                "fullName": role + " RBAC Test",
                "passwordHash": generate_password_hash(self.PASSWORD),
                "role": role,
                "isActive": True,
                "isLocked": False,
                "failedLoginAttempts": 0,
            }

            if role == "HOD":
                user["departmentId"] = "rbac-dept-1"

            db.session.add(
                PortalRecord(
                    collection="users",
                    record_key=account_id,
                    payload=user,
                )
            )

        # Department and course fixtures for HOD result scoping.
        db.session.add(
            PortalRecord(
                collection="departments",
                record_key="rbac-dept-1",
                payload={
                    "id": "rbac-dept-1",
                    "name": "RBAC Test Department",
                    "schoolId": "rbac-school-1",
                },
            )
        )

        db.session.add(
            PortalRecord(
                collection="courses",
                record_key="rbac-course-1",
                payload={
                    "id": "rbac-course-1",
                    "code": "RBAC101",
                    "title": "RBAC Test Course",
                    "departmentId": "rbac-dept-1",
                    "schoolId": "rbac-school-1",
                },
            )
        )

        db.session.add(
            PortalRecord(
                collection="students",
                record_key="rbac-student-1",
                payload={
                    "id": "rbac-student-1",
                    "userId": "rbac-student-user",
                    "matricNumber": "RBAC/001",
                },
            )
        )

        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def login_headers(self, account_name):
        account_id, email, role = self.accounts[account_name]

        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": email,
                "password": self.PASSWORD,
            },
        )

        self.assertEqual(
            response.status_code,
            200,
            msg=f"{role} login failed: {response.get_json()}",
        )

        token = response.get_json()["token"]
        return {"Authorization": "Bearer " + token}


    def test_lecturer_courses_returns_only_assigned_courses(self):
        db.session.add(
            PortalRecord(
                collection="courses",
                record_key="rbac-course-2",
                payload={
                    "id": "rbac-course-2",
                    "code": "RBAC202",
                    "title": "Unassigned Test Course",
                },
            )
        )
        db.session.add(
            PortalRecord(
                collection="courseAssignments",
                record_key="rbac-assignment-1",
                payload={
                    "id": "rbac-assignment-1",
                    "lecturerId": "rbac-lecturer",
                    "courseId": "rbac-course-1",
                    "session": "2025/2026",
                    "semester": "First Semester",
                    "status": "ACTIVE",
                },
            )
        )
        db.session.commit()

        response = self.client.get(
            "/api/v1/lecturer/courses",
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(response.status_code, 200)
        course_ids = [c["id"] for c in response.get_json()["courses"]]
        self.assertEqual(course_ids, ["rbac-course-1"])

    def test_lecturer_cannot_access_unassigned_course_roster(self):
        response = self.client.get(
            "/api/v1/lecturer/course-roster?courseId=rbac-course-1",
            headers=self.login_headers("lecturer"),
        )
        self.assertEqual(response.status_code, 403)

    def test_lecturer_roster_contains_only_approved_students(self):
        db.session.add(
            PortalRecord(
                collection="courseAssignments",
                record_key="rbac-assignment-1",
                payload={
                    "id": "rbac-assignment-1",
                    "lecturerId": "rbac-lecturer",
                    "courseId": "rbac-course-1",
                    "session": "2025/2026",
                    "semester": "First Semester",
                    "status": "ACTIVE",
                },
            )
        )

        db.session.add(
            PortalRecord(
                collection="students",
                record_key="rbac-student-2",
                payload={
                    "id": "rbac-student-2",
                    "userId": "rbac-student-user-2",
                    "matricNumber": "RBAC/002",
                },
            )
        )

        db.session.add(
            PortalRecord(
                collection="registrations",
                record_key="rbac-registration-approved",
                payload={
                    "id": "rbac-registration-approved",
                    "studentId": "rbac-student-1",
                    "courseIds": ["rbac-course-1"],
                    "session": "2025/2026",
                    "semester": "First Semester",
                    "status": "APPROVED_BY_HOD",
                },
            )
        )

        db.session.add(
            PortalRecord(
                collection="registrations",
                record_key="rbac-registration-pending",
                payload={
                    "id": "rbac-registration-pending",
                    "studentId": "rbac-student-2",
                    "courseIds": ["rbac-course-1"],
                    "session": "2025/2026",
                    "semester": "First Semester",
                    "status": "PENDING",
                },
            )
        )
        db.session.commit()

        response = self.client.get(
            "/api/v1/lecturer/course-roster?courseId=rbac-course-1",
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(response.status_code, 200)
        student_ids = [s["id"] for s in response.get_json()["students"]]
        self.assertEqual(student_ids, ["rbac-student-1"])



    def test_lecturer_attendance_ignores_submitted_academic_period(self):
        self.add_lecturer_assignment()
        self.add_approved_registration()

        response = self.client.post(
            "/api/v1/attendance",
            json={
                "courseId": "rbac-course-1",
                "session": "2099/2100",
                "semester": "Second Semester",
                "records": [
                    {"studentId": "rbac-student-1", "present": True}
                ],
            },
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(
            response.status_code,
            201,
            msg=str(response.get_json()),
        )
        saved = response.get_json()["session"]
        self.assertEqual(saved["session"], "2025/2026")
        self.assertEqual(saved["semester"], "First Semester")

    def test_assigned_lecturer_can_record_approved_student_attendance(self):
        self.add_lecturer_assignment()
        self.add_approved_registration()

        response = self.client.post(
            "/api/v1/attendance",
            json={
                "courseId": "rbac-course-1",
                "session": "2025/2026",
                "semester": "First Semester",
                "records": [
                    {"studentId": "rbac-student-1", "present": True}
                ],
            },
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(
            response.status_code,
            201,
            msg=str(response.get_json()),
        )
        self.assertTrue(response.get_json()["success"])
        self.assertEqual(
            response.get_json()["session"]["courseId"],
            "rbac-course-1",
        )

    def test_lecturer_cannot_record_attendance_for_unapproved_student(self):
        self.add_lecturer_assignment()

        response = self.client.post(
            "/api/v1/attendance",
            json={
                "courseId": "rbac-course-1",
                "session": "2025/2026",
                "semester": "First Semester",
                "records": [
                    {"studentId": "rbac-student-1", "present": True}
                ],
            },
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(response.status_code, 403)

        stored = PortalRecord.query.filter_by(
            collection="attendance"
        ).all()
        self.assertEqual(len(stored), 0)

    def test_unassigned_lecturer_cannot_record_attendance(self):
        self.add_approved_registration()

        response = self.client.post(
            "/api/v1/attendance",
            json={
                "courseId": "rbac-course-1",
                "session": "2025/2026",
                "semester": "First Semester",
                "records": [
                    {"studentId": "rbac-student-1", "present": True}
                ],
            },
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(response.status_code, 403)

        stored = PortalRecord.query.filter_by(
            collection="attendance"
        ).all()
        self.assertEqual(len(stored), 0)

    def test_registrar_can_list_students(self):
        response = self.client.get(
            "/api/v1/students",
            headers=self.login_headers("registrar"),
        )
        self.assertEqual(response.status_code, 200)

    def test_lecturer_cannot_list_all_students(self):
        response = self.client.get(
            "/api/v1/students",
            headers=self.login_headers("lecturer"),
        )
        self.assertEqual(response.status_code, 403)

    def test_bursar_cannot_list_students(self):
        response = self.client.get(
            "/api/v1/students",
            headers=self.login_headers("bursar"),
        )
        self.assertEqual(response.status_code, 403)

    def test_hod_cannot_list_students_under_current_route_policy(self):
        response = self.client.get(
            "/api/v1/students",
            headers=self.login_headers("hod"),
        )
        self.assertEqual(response.status_code, 403)

    def test_lecturer_can_list_results_under_current_route_policy(self):
        response = self.client.get(
            "/api/v1/results",
            headers=self.login_headers("lecturer"),
        )
        self.assertEqual(response.status_code, 200)

    def test_hod_can_list_results_under_current_route_policy(self):
        response = self.client.get(
            "/api/v1/results",
            headers=self.login_headers("hod"),
        )
        self.assertEqual(response.status_code, 200)

    def test_bursar_cannot_list_results(self):
        response = self.client.get(
            "/api/v1/results",
            headers=self.login_headers("bursar"),
        )
        self.assertEqual(response.status_code, 403)

    def test_admissions_officer_cannot_list_results(self):
        response = self.client.get(
            "/api/v1/results",
            headers=self.login_headers("admissions"),
        )
        self.assertEqual(response.status_code, 403)

    def test_legacy_registrar_role_is_normalized(self):
        self.login_headers("registrar")

        user = PortalRecord.query.filter_by(
            collection="users",
            record_key="rbac-registrar",
        ).first().payload

        self.assertEqual(user["role"], "ADMIN")
        self.assertEqual(user["category"], "REGISTRAR")

    def test_super_admin_can_list_students(self):
        response = self.client.get(
            "/api/v1/students",
            headers=self.login_headers("superadmin"),
        )
        self.assertEqual(response.status_code, 200)



    def add_test_record(self, collection, record_id, payload):
        db.session.add(
            PortalRecord(
                collection=collection,
                record_key=record_id,
                payload=payload,
            )
        )
        db.session.commit()

    def score_payload(self):
        return {
            "studentId": "rbac-student-1",
            "courseId": "rbac-course-1",
            "caScore": 20,
            "examScore": 50,
        }

    def add_lecturer_assignment(self):
        self.add_test_record(
            "courseAssignments",
            "rbac-assignment-1",
            {
                "id": "rbac-assignment-1",
                "lecturerId": "rbac-lecturer",
                "courseId": "rbac-course-1",
                "departmentId": "rbac-dept-1",
                "session": "2025/2026",
                "semester": "First Semester",
                "status": "ACTIVE",
            },
        )

    def add_approved_registration(self):
        self.add_test_record(
            "registrations",
            "rbac-registration-1",
            {
                "id": "rbac-registration-1",
                "studentId": "rbac-student-1",
                "courseIds": ["rbac-course-1"],
                "session": "2025/2026",
                "semester": "First Semester",
                "status": "APPROVED_BY_HOD",
            },
        )

    def test_assigned_lecturer_can_enter_score_for_approved_student(self):
        self.add_lecturer_assignment()
        self.add_approved_registration()

        response = self.client.post(
            "/api/v1/results/score-entry",
            json=self.score_payload(),
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(
            response.status_code,
            201,
            msg=str(response.get_json()),
        )
        result = response.get_json()["result"]
        self.assertEqual(result["status"], "SUBMITTED")
        self.assertEqual(result["totalScore"], 70)
        self.assertEqual(result["grade"], "A")
        self.assertEqual(result["submittedBy"], "rbac-lecturer")

    def test_unassigned_lecturer_cannot_enter_score(self):
        self.add_approved_registration()

        response = self.client.post(
            "/api/v1/results/score-entry",
            json=self.score_payload(),
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(response.status_code, 403)

    def test_lecturer_cannot_score_student_without_approved_registration(self):
        self.add_lecturer_assignment()

        response = self.client.post(
            "/api/v1/results/score-entry",
            json=self.score_payload(),
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(response.status_code, 403)

    def test_super_admin_can_enter_score_without_lecturer_assignment(self):
        response = self.client.post(
            "/api/v1/results/score-entry",
            json=self.score_payload(),
            headers=self.login_headers("superadmin"),
        )

        self.assertEqual(
            response.status_code,
            201,
            msg=str(response.get_json()),
        )
        self.assertEqual(
            response.get_json()["result"]["submittedBy"],
            "rbac-superadmin",
        )

    def test_hod_can_publish_result_in_own_department(self):
        self.add_test_record(
            "results",
            "rbac-result-own",
            {
                "id": "rbac-result-own",
                "studentId": "rbac-student-1",
                "courseId": "rbac-course-1",
                "status": "SUBMITTED",
            },
        )

        response = self.client.patch(
            "/api/v1/results/rbac-result-own/publish",
            headers=self.login_headers("hod"),
        )

        self.assertEqual(
            response.status_code,
            200,
            msg=str(response.get_json()),
        )
        self.assertEqual(
            response.get_json()["result"]["status"],
            "PUBLISHED",
        )
        self.assertEqual(
            response.get_json()["result"]["approvedBy"],
            "rbac-hod",
        )

    def test_hod_cannot_publish_result_from_another_department(self):
        self.add_test_record(
            "courses",
            "rbac-course-other",
            {
                "id": "rbac-course-other",
                "code": "OTHER101",
                "title": "Other Department Course",
                "departmentId": "rbac-dept-other",
                "schoolId": "rbac-school-other",
            },
        )
        self.add_test_record(
            "results",
            "rbac-result-other",
            {
                "id": "rbac-result-other",
                "studentId": "rbac-student-1",
                "courseId": "rbac-course-other",
                "status": "SUBMITTED",
            },
        )

        response = self.client.patch(
            "/api/v1/results/rbac-result-other/publish",
            headers=self.login_headers("hod"),
        )

        self.assertEqual(response.status_code, 403)


    def test_nan_score_is_rejected(self):
        payload = self.score_payload()
        payload["caScore"] = float("nan")

        response = self.client.post(
            "/api/v1/results/score-entry",
            json=payload,
            headers=self.login_headers("superadmin"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            PortalRecord.query.filter_by(collection="results").count(),
            0,
        )

    def test_infinite_score_is_rejected(self):
        payload = self.score_payload()
        payload["examScore"] = float("inf")

        response = self.client.post(
            "/api/v1/results/score-entry",
            json=payload,
            headers=self.login_headers("superadmin"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            PortalRecord.query.filter_by(collection="results").count(),
            0,
        )

    def test_duplicate_result_submission_is_rejected(self):
        headers = self.login_headers("superadmin")
        payload = self.score_payload()

        first = self.client.post(
            "/api/v1/results/score-entry",
            json=payload,
            headers=headers,
        )
        second = self.client.post(
            "/api/v1/results/score-entry",
            json=payload,
            headers=headers,
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)

        stored = [
            r for r in PortalRecord.query.filter_by(
                collection="results"
            ).all()
            if r.payload.get("studentId") == "rbac-student-1"
            and r.payload.get("courseId") == "rbac-course-1"
        ]
        self.assertEqual(len(stored), 1)

    def test_lecturer_cannot_publish_result(self):
        self.add_test_record(
            "results",
            "rbac-result-lecturer-publish",
            {
                "id": "rbac-result-lecturer-publish",
                "studentId": "rbac-student-1",
                "courseId": "rbac-course-1",
                "status": "SUBMITTED",
            },
        )

        response = self.client.patch(
            "/api/v1/results/rbac-result-lecturer-publish/publish",
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(response.status_code, 403)

        stored = PortalRecord.query.filter_by(
            collection="results",
            record_key="rbac-result-lecturer-publish",
        ).first()
        self.assertEqual(stored.payload["status"], "SUBMITTED")

    def test_published_result_cannot_be_published_again(self):
        original = {
            "id": "rbac-result-already-published",
            "studentId": "rbac-student-1",
            "courseId": "rbac-course-1",
            "status": "PUBLISHED",
            "publishedAt": "2026-01-01T10:00:00+00:00",
            "approvedBy": "original-approver",
            "totalScore": 75,
            "grade": "A",
        }
        self.add_test_record(
            "results",
            "rbac-result-already-published",
            original.copy(),
        )

        response = self.client.patch(
            "/api/v1/results/rbac-result-already-published/publish",
            headers=self.login_headers("superadmin"),
        )

        self.assertEqual(response.status_code, 409)

        stored = PortalRecord.query.filter_by(
            collection="results",
            record_key="rbac-result-already-published",
        ).first()

        self.assertEqual(stored.payload, original)

    def test_score_audit_failure_rolls_back_result(self):
        from unittest.mock import patch
        from app.routes.portal import audit as real_audit

        def fail_after_staging_audit(*args, **kwargs):
            real_audit(*args, **kwargs)
            raise RuntimeError("Simulated audit persistence failure")

        auth_headers = self.login_headers("superadmin")
        with patch(
            "app.routes.portal.audit",
            side_effect=fail_after_staging_audit
        ):
            response = self.client.post(
                "/api/v1/results/score-entry",
                json=self.score_payload(),
                headers=auth_headers,
            )

        self.assertEqual(response.status_code, 500)

        results = PortalRecord.query.filter_by(
            collection="results"
        ).all()

        matching_results = [
            row.payload for row in results
            if row.payload.get("studentId") == "rbac-student-1"
            and row.payload.get("courseId") == "rbac-course-1"
        ]

        self.assertEqual(
            matching_results,
            [],
            "A result must not remain saved when its audit write fails."
        )

        audit_rows = PortalRecord.query.filter_by(
            collection="auditLogs"
        ).all()

        matching_audits = [
            row.payload for row in audit_rows
            if row.payload.get("action") == "RESULT_SCORE_SUBMITTED"
            and row.payload.get("details", {}).get("studentId") == "rbac-student-1"
            and row.payload.get("details", {}).get("courseId") == "rbac-course-1"
        ]

        self.assertEqual(
            matching_audits,
            [],
            "A failed score transaction must not leave an audit event."
        )

    def test_publish_audit_failure_rolls_back_publication(self):
        from unittest.mock import patch
        from app.routes.portal import audit as real_audit

        self.add_test_record(
            "results",
            "rbac-result-audit-failure",
            {
                "id": "rbac-result-audit-failure",
                "studentId": "rbac-student-1",
                "courseId": "rbac-course-1",
                "session": "2025/2026",
                "semester": "First Semester",
                "status": "SUBMITTED",
            },
        )

        def fail_after_staging_audit(*args, **kwargs):
            real_audit(*args, **kwargs)
            raise RuntimeError("Simulated audit persistence failure")

        auth_headers = self.login_headers("hod")
        with patch(
            "app.routes.portal.audit",
            side_effect=fail_after_staging_audit
        ):
            response = self.client.patch(
                "/api/v1/results/rbac-result-audit-failure/publish",
                headers=auth_headers,
            )

        self.assertEqual(response.status_code, 500)

        saved_result = PortalRecord.query.filter_by(
            collection="results",
            record_key="rbac-result-audit-failure"
        ).first()

        self.assertIsNotNone(saved_result)
        self.assertEqual(
            saved_result.payload.get("status"),
            "SUBMITTED",
            "A failed publication transaction must preserve the original status."
        )
        self.assertNotIn("publishedAt", saved_result.payload)
        self.assertNotIn("approvedBy", saved_result.payload)

        audit_rows = PortalRecord.query.filter_by(
            collection="auditLogs"
        ).all()

        matching_audits = [
            row.payload for row in audit_rows
            if row.payload.get("action") == "RESULT_PUBLISHED"
            and row.payload.get("details", {}).get("resultId")
                == "rbac-result-audit-failure"
        ]

        self.assertEqual(
            matching_audits,
            [],
            "A failed publication transaction must not leave an audit event."
        )




    def mock_postgresql_advisory_lock(self, session_obj):
        original_get_bind = session_obj.get_bind
        original_execute = session_obj.execute
        lock_calls = []

        # Patch the scoped-session proxy used by the route's explicit
        # dialect check. ORM operations still use the real Session engine.
        get_bind_patch = patch.object(
            db.session,
            "get_bind",
            return_value=SimpleNamespace(
                dialect=SimpleNamespace(name="postgresql")
            ),
        )

        def execute_with_lock_capture(*args, **kwargs):
            statement = args[0] if args else kwargs.get("statement")

            if statement is not None and "pg_advisory_xact_lock" in str(statement):
                parameters = (
                    args[1] if len(args) > 1
                    else kwargs.get("params")
                )
                lock_calls.append((statement, parameters))
                # The test database is SQLite. Do not execute PostgreSQL SQL.
                return None

            return original_execute(*args, **kwargs)

        execute_patch = patch.object(
            session_obj,
            "execute",
            side_effect=execute_with_lock_capture,
        )

        return get_bind_patch, execute_patch, lock_calls

    def test_audit_endpoint_role_permissions(self):
        allowed_accounts = ("superadmin", "registrar")
        denied_accounts = ("bursar", "hod", "ict_admin")

        for account in allowed_accounts:
            with self.subTest(account=account):
                response = self.client.get(
                    "/api/v1/audit",
                    headers=self.login_headers(account),
                )
                self.assertEqual(
                    response.status_code,
                    200,
                    msg=f"{account} should be allowed to view audit logs: "
                        f"{response.get_json()}",
                )

        for account in denied_accounts:
            with self.subTest(account=account):
                response = self.client.get(
                    "/api/v1/audit",
                    headers=self.login_headers(account),
                )
                self.assertEqual(
                    response.status_code,
                    403,
                    msg=f"{account} should not be allowed to view audit logs.",
                )

    def test_dashboard_audit_visibility_is_role_filtered(self):
        self.add_test_record(
            "auditLogs",
            "rbac-dashboard-audit-1",
            {
                "id": "rbac-dashboard-audit-1",
                "timestamp": "2026-11-05T10:00:00",
                "action": "RBAC_DASHBOARD_TEST",
                "resource": "TEST",
                "details": {"test": True},
            },
        )

        superadmin_response = self.client.get(
            "/api/v1/dashboard/stats",
            headers=self.login_headers("superadmin"),
        )
        self.assertEqual(
            superadmin_response.status_code,
            200,
            msg=str(superadmin_response.get_json()),
        )

        superadmin_logs = superadmin_response.get_json()["stats"]["recentAuditLogs"]
        self.assertTrue(
            any(
                item.get("id") == "rbac-dashboard-audit-1"
                for item in superadmin_logs
            ),
            "Super Admin should receive recent audit logs.",
        )

        for account in ("bursar", "hod"):
            with self.subTest(account=account):
                response = self.client.get(
                    "/api/v1/dashboard/stats",
                    headers=self.login_headers(account),
                )
                self.assertEqual(
                    response.status_code,
                    200,
                    msg=str(response.get_json()),
                )
                self.assertEqual(
                    response.get_json()["stats"]["recentAuditLogs"],
                    [],
                    f"{account} must not receive dashboard audit logs.",
                )

    def test_score_submission_uses_deterministic_storage_key(self):
        import hashlib
        import json

        self.add_lecturer_assignment()
        self.add_approved_registration()

        response = self.client.post(
            "/api/v1/results/score-entry",
            json=self.score_payload(),
            headers=self.login_headers("lecturer"),
        )

        self.assertEqual(
            response.status_code,
            201,
            msg=str(response.get_json()),
        )

        result = response.get_json()["result"]
        identity = json.dumps(
            [
                "rbac-student-1",
                "rbac-course-1",
                "2025/2026",
                "First Semester",
            ],
            ensure_ascii=False,
            separators=(",", ":"),
        )
        expected_key = "result:" + hashlib.sha256(
            identity.encode("utf-8")
        ).hexdigest()

        stored_result = PortalRecord.query.filter_by(
            collection="results",
            record_key=expected_key,
        ).first()

        self.assertIsNotNone(
            stored_result,
            "The result must use its deterministic internal storage key.",
        )
        self.assertEqual(
            stored_result.payload["id"],
            result["id"],
            "The public result ID must remain unchanged.",
        )

        audit_rows = PortalRecord.query.filter_by(
            collection="auditLogs",
        ).all()

        matching_audits = [
            row.payload for row in audit_rows
            if row.payload.get("action") == "RESULT_SCORE_SUBMITTED"
            and row.payload.get("details", {}).get("resultId") == result["id"]
        ]

        self.assertEqual(
            len(matching_audits),
            1,
            "The successful score transaction must persist exactly one audit event.",
        )

    def test_duplicate_score_submission_returns_conflict(self):
        self.add_lecturer_assignment()
        self.add_approved_registration()

        headers = self.login_headers("lecturer")
        payload = self.score_payload()

        first_response = self.client.post(
            "/api/v1/results/score-entry",
            json=payload,
            headers=headers,
        )
        self.assertEqual(
            first_response.status_code,
            201,
            msg=str(first_response.get_json()),
        )

        second_response = self.client.post(
            "/api/v1/results/score-entry",
            json=payload,
            headers=headers,
        )
        self.assertEqual(
            second_response.status_code,
            409,
            msg=str(second_response.get_json()),
        )

        results = PortalRecord.query.filter_by(
            collection="results",
        ).all()

        matching_results = [
            row for row in results
            if str(row.payload.get("studentId")) == "rbac-student-1"
            and str(row.payload.get("courseId")) == "rbac-course-1"
            and str(row.payload.get("session")) == "2025/2026"
            and str(row.payload.get("semester")) == "First Semester"
        ]

        self.assertEqual(
            len(matching_results),
            1,
            "Only one result may exist for the same academic record.",
        )



    def test_logout_revokes_token_and_records_audit_event(self):
        headers = self.login_headers("superadmin")

        response = self.client.post(
            "/api/v1/auth/logout",
            headers=headers,
        )

        self.assertEqual(
            response.status_code,
            200,
            msg=str(response.get_json()),
        )
        self.assertTrue(response.get_json().get("success"))

        # The same bearer token must no longer authenticate.
        protected_response = self.client.get(
            "/api/v1/auth/me",
            headers=headers,
        )
        self.assertEqual(
            protected_response.status_code,
            401,
            msg="A logged-out JWT must be rejected.",
        )

        audit_rows = PortalRecord.query.filter_by(
            collection="auditLogs",
        ).all()

        logout_events = [
            row.payload for row in audit_rows
            if row.payload.get("action") == "LOGOUT"
            and row.payload.get("userId") == "rbac-superadmin"
        ]

        self.assertEqual(
            len(logout_events),
            1,
            "A successful logout must create exactly one LOGOUT audit event.",
        )

        blocklist_rows = PortalRecord.query.filter_by(
            collection="jwtBlocklist",
        ).all()

        self.assertEqual(
            len(blocklist_rows),
            1,
            "The revoked JWT must be stored in the persistent blocklist.",
        )

    def test_logout_requires_authentication(self):
        response = self.client.post("/api/v1/auth/logout")

        self.assertEqual(
            response.status_code,
            401,
            msg="Unauthenticated logout requests must be rejected.",
        )


if __name__ == "__main__":
    unittest.main()
