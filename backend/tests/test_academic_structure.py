import unittest

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models.portal_record import PortalRecord


class TestAcademicStructure(unittest.TestCase):
    PASSWORD = "Password123!"

    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

        db.create_all()

        self.accounts = {
            "registrar": (
                "academic-registrar",
                "academic-registrar@test.local",
                "REGISTRAR",
            ),
            "lecturer": (
                "academic-lecturer",
                "academic-lecturer@test.local",
                "LECTURER",
            ),
        }

        for account_id, email, role in self.accounts.values():
            user = {
                "id": account_id,
                "email": email,
                "fullName": role + " Academic Test",
                "passwordHash": generate_password_hash(self.PASSWORD),
                "role": role,
                "isActive": True,
                "isLocked": False,
                "failedLoginAttempts": 0,
            }

            db.session.add(
                PortalRecord(
                    collection="users",
                    record_key=account_id,
                    payload=user,
                )
            )

        self.put_record(
            "schools",
            {
                "id": "school-1",
                "name": "School of Applied Sciences",
                "code": "SAS",
                "status": "ACTIVE",
            },
        )

        self.put_record(
            "departments",
            {
                "id": "dept-1",
                "schoolId": "school-1",
                "code": "SCI",
                "name": "Department of Science",
                "status": "ACTIVE",
            },
        )

        self.put_record(
            "programmes",
            {
                "id": "programme-1",
                "departmentId": "dept-1",
                "code": "NDCS",
                "name": "Computer Science",
                "qualification": "ND",
                "durationYears": 2,
                "requirements": [],
                "status": "ACTIVE",
            },
        )

        self.put_record(
            "applications",
            {
                "id": "application-1",
                "userId": "applicant-1",
                "programmeId": "programme-1",
                "session": "2026/2027",
                "status": "OFFERED",
                "gender": "Other",
                "dob": "2005-01-01",
                "phone": "08000000000",
            },
        )

        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def put_record(self, collection, payload):
        db.session.add(
            PortalRecord(
                collection=collection,
                record_key=str(payload["id"]),
                payload=payload,
            )
        )

    def records(self, collection):
        return [
            item.payload
            for item in PortalRecord.query.filter_by(
                collection=collection
            ).all()
        ]

    def get_record(self, collection, record_id):
        record = PortalRecord.query.filter_by(
            collection=collection,
            record_key=str(record_id),
        ).first()

        return record.payload if record else None

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

    def department_payload(self, **overrides):
        payload = {
            "code": "NEWDEP",
            "name": "New Test Department",
            "schoolId": "school-1",
            "description": "Academic integration test",
        }
        payload.update(overrides)
        return payload

    def programme_payload(self, **overrides):
        payload = {
            "code": "NEWPROG",
            "name": "New Test Programme",
            "departmentId": "dept-1",
            "qualification": "ND",
            "durationYears": 2,
            "requirements": ["Five O-Level credits"],
            "description": "Academic integration test",
        }
        payload.update(overrides)
        return payload

    # ---------------------------------------------------------
    # DEPARTMENT CREATION
    # ---------------------------------------------------------

    def test_department_creation_returns_201(self):
        response = self.client.post(
            "/api/v1/academics/departments",
            headers=self.login_headers("registrar"),
            json=self.department_payload(),
        )

        self.assertEqual(response.status_code, 201)

        data = response.get_json()
        self.assertTrue(data["success"])

        department = data["department"]

        self.assertEqual(department["schoolId"], "school-1")
        self.assertEqual(department["code"], "NEWDEP")
        self.assertEqual(department["status"], "ACTIVE")

    def test_department_creation_writes_audit_event(self):
        response = self.client.post(
            "/api/v1/academics/departments",
            headers=self.login_headers("registrar"),
            json=self.department_payload(),
        )

        self.assertEqual(response.status_code, 201)

        matching = [
            item for item in self.records("auditLogs")
            if item.get("action") == "DEPARTMENT_CREATED"
        ]

        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]["resource"], "DEPARTMENT")
        self.assertEqual(
            matching[0]["details"]["schoolId"],
            "school-1",
        )

    def test_department_duplicate_code_is_case_insensitive(self):
        response = self.client.post(
            "/api/v1/academics/departments",
            headers=self.login_headers("registrar"),
            json=self.department_payload(
                code="sci",
                name="Duplicate Science Department",
            ),
        )

        self.assertEqual(response.status_code, 409)

    def test_department_missing_required_fields_returns_400(self):
        response = self.client.post(
            "/api/v1/academics/departments",
            headers=self.login_headers("registrar"),
            json={
                "code": "MISSING",
                "name": "Missing School Department",
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_department_unknown_school_returns_404(self):
        response = self.client.post(
            "/api/v1/academics/departments",
            headers=self.login_headers("registrar"),
            json=self.department_payload(schoolId="unknown-school"),
        )

        self.assertEqual(response.status_code, 404)

    def test_department_inactive_school_returns_400(self):
        self.put_record(
            "schools",
            {
                "id": "inactive-school",
                "name": "Inactive School",
                "status": "INACTIVE",
            },
        )
        db.session.commit()

        response = self.client.post(
            "/api/v1/academics/departments",
            headers=self.login_headers("registrar"),
            json=self.department_payload(schoolId="inactive-school"),
        )

        self.assertEqual(response.status_code, 400)

    # ---------------------------------------------------------
    # PROGRAMME CREATION
    # ---------------------------------------------------------

    def test_programme_creation_returns_201(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(),
        )

        self.assertEqual(response.status_code, 201)

        data = response.get_json()
        self.assertTrue(data["success"])

        programme = data["programme"]

        self.assertEqual(programme["departmentId"], "dept-1")
        self.assertEqual(programme["code"], "NEWPROG")
        self.assertEqual(programme["qualification"], "ND")
        self.assertEqual(programme["durationYears"], 2)
        self.assertEqual(programme["status"], "ACTIVE")

    def test_programme_creation_writes_audit_event(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(),
        )

        self.assertEqual(response.status_code, 201)

        matching = [
            item for item in self.records("auditLogs")
            if item.get("action") == "PROGRAMME_CREATED"
        ]

        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]["resource"], "PROGRAMME")
        self.assertEqual(
            matching[0]["details"]["departmentId"],
            "dept-1",
        )

    def test_programme_duplicate_code_is_case_insensitive(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(code="ndcs"),
        )

        self.assertEqual(response.status_code, 409)

    def test_programme_unknown_department_returns_404(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(
                departmentId="unknown-department",
            ),
        )

        self.assertEqual(response.status_code, 404)

    def test_programme_inactive_department_returns_400(self):
        self.put_record(
            "departments",
            {
                "id": "inactive-department",
                "schoolId": "school-1",
                "code": "INACTIVE",
                "name": "Inactive Department",
                "status": "INACTIVE",
            },
        )
        db.session.commit()

        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(
                departmentId="inactive-department",
            ),
        )

        self.assertEqual(response.status_code, 400)

    def test_programme_missing_parent_school_returns_404(self):
        self.put_record(
            "departments",
            {
                "id": "orphan-department",
                "schoolId": "missing-school",
                "code": "ORPHAN",
                "name": "Orphan Department",
                "status": "ACTIVE",
            },
        )
        db.session.commit()

        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(
                departmentId="orphan-department",
            ),
        )

        self.assertEqual(response.status_code, 404)

    def test_programme_inactive_parent_school_returns_400(self):
        self.put_record(
            "schools",
            {
                "id": "inactive-parent-school",
                "name": "Inactive Parent School",
                "status": "INACTIVE",
            },
        )

        self.put_record(
            "departments",
            {
                "id": "inactive-parent-dept",
                "schoolId": "inactive-parent-school",
                "code": "IPD",
                "name": "Inactive Parent Department",
                "status": "ACTIVE",
            },
        )
        db.session.commit()

        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(
                departmentId="inactive-parent-dept",
            ),
        )

        self.assertEqual(response.status_code, 400)

    def test_programme_invalid_qualification_returns_400(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(qualification="BSC"),
        )

        self.assertEqual(response.status_code, 400)

    def test_programme_non_integer_duration_returns_400(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(durationYears="two"),
        )

        self.assertEqual(response.status_code, 400)

    def test_programme_duration_out_of_range_returns_400(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(durationYears=0),
        )

        self.assertEqual(response.status_code, 400)

    def test_programme_invalid_requirements_type_returns_400(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("registrar"),
            json=self.programme_payload(requirements={"subject": "English"}),
        )

        self.assertEqual(response.status_code, 400)

    # ---------------------------------------------------------
    # AUTHORIZATION
    # ---------------------------------------------------------

    def test_lecturer_cannot_create_department(self):
        response = self.client.post(
            "/api/v1/academics/departments",
            headers=self.login_headers("lecturer"),
            json=self.department_payload(),
        )

        self.assertEqual(response.status_code, 403)

    def test_lecturer_cannot_create_programme(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            headers=self.login_headers("lecturer"),
            json=self.programme_payload(),
        )

        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_user_cannot_create_department(self):
        response = self.client.post(
            "/api/v1/academics/departments",
            json=self.department_payload(),
        )

        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_user_cannot_create_programme(self):
        response = self.client.post(
            "/api/v1/academics/programmes",
            json=self.programme_payload(),
        )

        self.assertEqual(response.status_code, 401)

    # ---------------------------------------------------------
    # ADMISSION ACCEPTANCE AND RELATIONSHIP INTEGRITY
    # ---------------------------------------------------------

    def test_accept_offer_creates_student_with_correct_relationships(self):
        response = self.client.post(
            "/api/v1/admissions/application-1/accept-offer",
            headers=self.login_headers("registrar"),
        )

        self.assertEqual(response.status_code, 201)

        data = response.get_json()
        self.assertTrue(data["success"])

        student = data["student"]

        self.assertEqual(student["userId"], "applicant-1")
        self.assertEqual(student["programmeId"], "programme-1")
        self.assertEqual(student["departmentId"], "dept-1")
        self.assertEqual(student["schoolId"], "school-1")

        application = self.get_record(
            "applications",
            "application-1",
        )

        self.assertEqual(application["status"], "ACCEPTED")

    def test_accept_offer_writes_required_audit_event(self):
        response = self.client.post(
            "/api/v1/admissions/application-1/accept-offer",
            headers=self.login_headers("registrar"),
        )

        self.assertEqual(response.status_code, 201)

        matching = [
            item for item in self.records("auditLogs")
            if item.get("action") == "ADMISSION_OFFER_ACCEPTED"
        ]

        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]["resource"], "ADMISSION")
        self.assertEqual(
            matching[0]["details"]["applicationId"],
            "application-1",
        )
        self.assertEqual(
            matching[0]["details"]["programmeId"],
            "programme-1",
        )

    def test_accept_offer_twice_does_not_duplicate_student(self):
        headers = self.login_headers("registrar")

        first = self.client.post(
            "/api/v1/admissions/application-1/accept-offer",
            headers=headers,
        )

        second = self.client.post(
            "/api/v1/admissions/application-1/accept-offer",
            headers=headers,
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)

        students = [
            item for item in self.records("students")
            if item.get("userId") == "applicant-1"
        ]

        self.assertEqual(len(students), 1)

    def test_accept_offer_rejects_application_without_offer(self):
        application = self.get_record(
            "applications",
            "application-1",
        )
        application["status"] = "SUBMITTED"

        record = PortalRecord.query.filter_by(
            collection="applications",
            record_key="application-1",
        ).first()

        record.payload = application
        db.session.commit()

        response = self.client.post(
            "/api/v1/admissions/application-1/accept-offer",
            headers=self.login_headers("registrar"),
        )

        self.assertEqual(response.status_code, 400)

    def test_accept_offer_returns_404_for_unknown_application(self):
        response = self.client.post(
            "/api/v1/admissions/unknown-application/accept-offer",
            headers=self.login_headers("registrar"),
        )

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
