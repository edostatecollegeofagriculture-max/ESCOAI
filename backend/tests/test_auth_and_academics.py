import unittest
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models.portal_record import PortalRecord

class TestEdocasBackend(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.ctx = self.app.app_context(); self.ctx.push(); db.create_all()
        user = {'id':'test-admin','email':'admin@edocas.edu.ng','fullName':'Dr. Test Admin','passwordHash':generate_password_hash('Password123!'),'role':'SUPER_ADMIN','isActive':True,'isLocked':False,'failedLoginAttempts':0}
        db.session.add(PortalRecord(collection='users',record_key=user['id'],payload=user))

        school = {
            'id': 'school-1',
            'name': 'Test School of Applied Sciences'
        }
        department = {
            'id': 'dept-1',
            'name': 'Test Computer Science Department',
            'schoolId': 'school-1'
        }

        db.session.add(PortalRecord(
            collection='schools',
            record_key=school['id'],
            payload=school
        ))
        db.session.add(PortalRecord(
            collection='departments',
            record_key=department['id'],
            payload=department
        ))

        db.session.commit()
    def tearDown(self):
        db.session.remove(); db.drop_all(); self.ctx.pop()
    def test_health_check(self):
        response=self.client.get('/api/health'); self.assertEqual(response.status_code,200); self.assertEqual(response.get_json().get('status'),'UP')
    def test_admin_login_success(self):
        response=self.client.post('/api/v1/auth/login',json={'email':'admin@edocas.edu.ng','password':'Password123!'})
        self.assertEqual(response.status_code,200); self.assertTrue(response.get_json().get('success')); self.assertIn('token',response.get_json())
    def test_invalid_login_rejected(self):
        response=self.client.post('/api/v1/auth/login',json={'email':'admin@edocas.edu.ng','password':'WrongPassword!'})
        self.assertEqual(response.status_code,401); self.assertFalse(response.get_json().get('success'))
    def test_protected_endpoint_without_token(self):
        response=self.client.get('/api/v1/auth/me'); self.assertEqual(response.status_code,401)
    def test_courses_require_authentication(self):
        response=self.client.post('/api/v1/academics/courses',json={'code':'CSC101','title':'Computing'})
        self.assertEqual(response.status_code,401)
    def test_admin_can_create_course(self):
        login=self.client.post('/api/v1/auth/login',json={'email':'admin@edocas.edu.ng','password':'Password123!'}).get_json()
        response=self.client.post('/api/v1/academics/courses',headers={'Authorization':'Bearer '+login['token']},json={'code':'CSC101','title':'Computing','departmentId':'dept-1','creditUnits':3,'level':'ND I','semester':'First Semester'})
        self.assertEqual(response.status_code,201); self.assertEqual(response.get_json()['course']['code'],'CSC101')
if __name__=='__main__': unittest.main()

