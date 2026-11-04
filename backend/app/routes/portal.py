import os, json, uuid, secrets, string
from datetime import datetime, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import check_password_hash, generate_password_hash
from app.extensions import db, limiter
from app.models.portal_record import PortalRecord

portal_bp = Blueprint('portal', __name__, url_prefix='/api/v1')
COLLECTIONS = {
 'users':'users','schools':'schools','departments':'departments','programmes':'programmes','courses':'courses',
 'applications':'applications','students':'students','registrations':'registrations','results':'results',
 'feeSchedules':'feeSchedules','invoices':'invoices','payments':'payments','attendance':'attendance',
 'supportTickets':'supportTickets','auditLogs':'auditLogs','newsArticles':'newsArticles','sliderSlides':'sliderSlides'
}
def now(): return datetime.now(timezone.utc).isoformat()
def all_records(name):
 return [r.payload for r in PortalRecord.query.filter_by(collection=name).all()]
def get_record(name, key):
 r=PortalRecord.query.filter_by(collection=name, record_key=str(key)).first()
 return r.payload if r else None
def put_record(name, obj):
 key=str(obj.get('id') or obj.get('email') or uuid.uuid4())
 obj=dict(obj); obj.setdefault('id',key)
 r=PortalRecord.query.filter_by(collection=name, record_key=key).first()
 if r: r.payload=obj
 else: db.session.add(PortalRecord(collection=name,record_key=key,payload=obj))
 db.session.commit(); return obj
def remove_record(name,key):
 r=PortalRecord.query.filter_by(collection=name,record_key=str(key)).first()
 if not r: return False
 db.session.delete(r); db.session.commit(); return True
def user_by_email(email):
 return next((u for u in all_records('users') if u.get('email','').strip().lower()==email.strip().lower()),None)
def current_user():
 ident=get_jwt_identity()
 return get_record('users',ident) or user_by_email(str(ident))
def role_required(*roles):
 def deco(fn):
  @wraps(fn)
  @jwt_required()
  def wrapped(*args,**kwargs):
   u=current_user()
   if not u: return jsonify(success=False,message='User record not found.'),401
   if not u.get('isActive',True): return jsonify(success=False,message='User account is deactivated.'),403
   if u.get('isLocked',False): return jsonify(success=False,message='User account is locked.'),403
   if u.get('role')!='SUPER_ADMIN' and roles and u.get('role') not in roles: return jsonify(success=False,message='Insufficient permissions.'),403
   return fn(*args,**kwargs)
  return wrapped
 return deco
def audit(action, resource, details=None, user=None):
 user=user or {}
 put_record('auditLogs',{'id':str(uuid.uuid4()),'timestamp':now(),'userId':user.get('id'),'userEmail':user.get('email'),'action':action,'resource':resource,'details':details or {},'ipAddress':request.remote_addr})
def response_list(key, items): return jsonify(success=True, **{key:items})
def new_id(): return str(uuid.uuid4())
def body():
 data=request.get_json(silent=True)
 return data if isinstance(data,dict) else {}
def filtered(collection):
 rows=all_records(collection)
 for k,v in request.args.items():
  if k in ('search','q','activeOnly','sliderOnly'): continue
  if v: rows=[x for x in rows if str(x.get(k,'' )).lower()==v.lower()]
 q=request.args.get('search','').strip().lower()
 if q: rows=[x for x in rows if q in json.dumps(x,ensure_ascii=False).lower()]
 return rows

@portal_bp.get('/health')
def health(): return jsonify(status='UP',service='EDOCASTI Flask REST API',timestamp=now())

@portal_bp.post('/auth/login')
@limiter.limit('5 per minute; 30 per hour')
def login():
 d=body(); email=str(d.get('email','')).strip().lower(); password=str(d.get('password',''))
 if len(email) > 254 or len(password) > 128: return jsonify(success=False,message='Invalid email or password.'),401
 if not email or not password: return jsonify(success=False,message='Email and password are required.'),400
 u=user_by_email(email)
 if not u: audit('LOGIN_FAILED','AUTH',{'email':email,'reason':'User not found'}); return jsonify(success=False,message='Invalid email or password.'),401
 if u.get('isLocked'): return jsonify(success=False,message='Account is locked. Please contact the ICT Administrator.'),403
 if not u.get('isActive',True): return jsonify(success=False,message='Account is deactivated.'),403
 hashed=u.get('passwordHash','')
 valid=False
 try:
  if hashed.startswith(('$2a$','$2b$','$2y$')):
   import bcrypt; valid=bcrypt.checkpw(password.encode(),hashed.encode())
  else: valid=check_password_hash(hashed,password)
 except Exception: valid=False
 if not valid:
  u['failedLoginAttempts']=int(u.get('failedLoginAttempts',0))+1
  # Do not permanently lock accounts from unauthenticated attempts (account-lockout DoS).
  put_record('users',u); audit('LOGIN_FAILED_PASSWORD','AUTH',{'email':email},u)
  return jsonify(success=False,message='Invalid email or password.'),401
 u['failedLoginAttempts']=0; u['lastLogin']=now(); put_record('users',u); audit('LOGIN_SUCCESS','AUTH',{},u)
 token=create_access_token(identity=str(u['id']),additional_claims={'role':u.get('role'),'email':u.get('email'),'fullName':u.get('fullName')})
 return jsonify(success=True,token=token,user={k:u.get(k) for k in ('id','email','fullName','role','isActive','isLocked')})

@portal_bp.post('/auth/register-applicant')
@limiter.limit('3 per hour')
def register_applicant():
 d=body(); email=str(d.get('email','')).strip().lower(); password=str(d.get('password','')); name=str(d.get('fullName','')).strip()
 if not email or len(email) > 254 or len(password) < 12 or len(password) > 128 or not name or len(name) > 160: return jsonify(success=False,message='Full name, valid email and a password of 12–128 characters are required.'),400
 if user_by_email(email): return jsonify(success=False,message='An account with this email already exists.'),409
 u={'id':new_id(),'email':email,'passwordHash':generate_password_hash(password),'fullName':name,'role':'APPLICANT','phone':d.get('phone'),'isActive':True,'isLocked':False,'failedLoginAttempts':0,'createdAt':now()}; put_record('users',u)
 token=create_access_token(identity=str(u['id']),additional_claims={'role':u['role'],'email':email,'fullName':name})
 return jsonify(success=True,token=token,user={k:u.get(k) for k in ('id','email','fullName','role') }),201

@portal_bp.get('/auth/me')
@jwt_required()
def me():
 u=current_user()
 if not u:return jsonify(success=False,message='User not found'),404
 return jsonify(success=True,user={k:u.get(k) for k in ('id','email','fullName','role','isActive','isLocked','phone')})

@portal_bp.post('/auth/change-password')
@jwt_required()
def change_password():
 d=body(); u=current_user()
 if not u:return jsonify(success=False,message='User not found'),404
 old=str(d.get('currentPassword','')); new=str(d.get('newPassword',''))
 h=u.get('passwordHash','')
 try:
  import bcrypt; valid=bcrypt.checkpw(old.encode(),h.encode()) if h.startswith(('$2a$','$2b$','$2y$')) else check_password_hash(h,old)
 except Exception: valid=False
 if not valid:return jsonify(success=False,message='Current password is incorrect.'),400
 if len(new)<12 or len(new)>128:return jsonify(success=False,message='New password must contain 12–128 characters.'),400
 u['passwordHash']=generate_password_hash(new); put_record('users',u); audit('PASSWORD_CHANGED','AUTH',{},u)
 return jsonify(success=True,message='Password changed successfully.')

@portal_bp.get('/settings')
def get_settings():
 defaults={'id':'default','institutionName':'Edo State College of Agriculture, Science and Technology','shortName':'EDOCASTI','currentSession':'2025/2026','currentSemester':'First Semester','admissionsOpen':True,'courseRegistrationOpen':True,'caMaxMarks':40,'examMaxMarks':60}
 stored=get_record('settings','default') or {}
 public_keys={'id','institutionName','shortName','logoUrl','faviconUrl','currentSession','currentSemester','admissionsOpen','courseRegistrationOpen','caMaxMarks','examMaxMarks','contactEmail','contactPhone','address','website','theme'}
 return jsonify(success=True,settings={**defaults, **{k:v for k,v in stored.items() if k in public_keys}})
@portal_bp.put('/settings')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR')
def update_settings():
 d=body(); allowed={'institutionName','shortName','logoUrl','faviconUrl','currentSession','currentSemester','admissionsOpen','courseRegistrationOpen','caMaxMarks','examMaxMarks','contactEmail','contactPhone','address','website','theme'}; d={k:v for k,v in d.items() if k in allowed}; old=get_record('settings','default') or {'id':'default'}; old.update(d); old['id']='default'; put_record('settings',old); audit('SETTINGS_UPDATED','SETTINGS',{},current_user()); return jsonify(success=True,settings={k:v for k,v in old.items() if k in allowed | {'id'}})

# Academic collections
@portal_bp.get('/academics/schools')
def schools(): return response_list('schools',all_records('schools'))
@portal_bp.get('/academics/departments')
def departments(): return response_list('departments',all_records('departments'))
@portal_bp.get('/academics/programmes')
def programmes(): return response_list('programmes',all_records('programmes'))
@portal_bp.get('/academics/courses')
def list_courses(): return response_list('courses',filtered('courses'))
@portal_bp.post('/academics/courses')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','LECTURER')
def create_course():
 d=body(); d['id']=new_id()
 if not d.get('code') or not d.get('title'): return jsonify(success=False,message='Course code and title are required.'),400
 if any(x.get('code','').lower()==str(d['code']).lower() for x in all_records('courses')): return jsonify(success=False,message='Course code already exists.'),409
 return jsonify(success=True,course=put_record('courses',d)),201

@portal_bp.get('/search')
def search():
 q=request.args.get('q','').strip().lower()[:120]
 actor=None
 try:
  from flask_jwt_extended import verify_jwt_in_request
  verify_jwt_in_request(optional=True)
  actor=current_user() if get_jwt_identity() else None
 except Exception:
  actor=None
 staff_roles={'SUPER_ADMIN','ADMIN','REGISTRAR','ICT_ADMIN','ADMISSIONS_OFFICER','LECTURER','HOD'}
 can_search_people=bool(actor and actor.get('role') in staff_roles and actor.get('isActive',True) and not actor.get('isLocked',False))
 students=[]
 if can_search_people:
  for s in all_records('students'):
   u=get_record('users',s.get('userId')); p=get_record('programmes',s.get('programmeId'))
   x={'id':s.get('id'),'matricNumber':s.get('matricNumber'),'fullName':(u or {}).get('fullName','Student'),'programmeName':(p or {}).get('name',''),'level':s.get('level'),'type':'STUDENT'}
   if not q or q in json.dumps(x).lower(): students.append(x)
 applicants=[]
 if can_search_people:
  for a in all_records('applications'):
   p=get_record('programmes',a.get('programmeId')); x={'id':a.get('id'),'applicationNumber':a.get('applicationNumber'),'fullName':f"{a.get('firstName','')} {a.get('lastName','')}",'programmeName':(p or {}).get('name',''),'status':a.get('status'),'type':'APPLICANT'}
   if not q or q in json.dumps(x).lower(): applicants.append(x)
 courses=[dict(c,type='COURSE') for c in all_records('courses') if not q or q in json.dumps(c).lower()]
 sections=[{'title':'Public College Overview','tab':'public','subSection':'overview','description':'About EDOCASTI, schools, mission and campuses'},{'title':'Schools & Academic Programmes','tab':'public','subSection':'programmes','description':'Academic programmes and courses'},{'title':'Online Admission Screening Form','tab':'admissions','subSection':'form','description':'Submit admissions application'},{'title':'Student Course Registration','tab':'student','subSection':'courses','description':'Register semester courses'},{'title':'Semester Published Results','tab':'student','subSection':'results','description':'View published results'},{'title':'Executive Management Analytics','tab':'admin','subSection':'analytics','description':'Institutional KPIs and charts'},{'title':'Content Management Module (CMS)','tab':'admin','subSection':'cms','description':'Manage news and slides'}]
 if q: sections=[x for x in sections if q in json.dumps(x).lower()]
 docs=[{'id':'doc-admission','title':'Provisional Offer of Admission Letter','category':'Admissions Office','slipType':'ADMISSION_LETTER','description':'Official letter for accepted candidates','type':'DOCUMENT'},{'id':'doc-reg','title':'Course Registration & Examination Clearance Slip','category':'Academic Registry','slipType':'COURSE_REGISTRATION','description':'Semester course enrollment slip','type':'DOCUMENT'},{'id':'doc-receipt','title':'Official Bursary Electronic Payment Receipt','category':'Bursary & Accounts','slipType':'PAYMENT_RECEIPT','description':'Electronic payment receipt','type':'DOCUMENT'},{'id':'doc-result','title':'Official Statement of Academic Results / Transcript','category':'Examination Office','slipType':'RESULT_SLIP','description':'Academic results and transcript','type':'DOCUMENT'},{'id':'doc-idcard','title':'Student Identity Card Credential','category':'Security & Registry','slipType':'STUDENT_ID','description':'Institutional identity card','type':'DOCUMENT'}]
 return jsonify(success=True,query=q,results={'students':students[:6],'applicants':applicants[:6],'courses':courses[:6],'documents':[x for x in docs if not q or q in json.dumps(x).lower()],'sections':sections})

# Generic collection routes, with route-specific response keys and authorization.
@portal_bp.get('/users')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','ICT_ADMIN')
def list_users():
 rows=filtered('users'); role=request.args.get('role')
 if role: rows=[u for u in rows if u.get('role')==role]
 return response_list('users',[{k:v for k,v in u.items() if k!='passwordHash'} for u in rows])
@portal_bp.post('/users')
@role_required('SUPER_ADMIN','ADMIN','ICT_ADMIN')
def create_user():
 d=body(); email=str(d.get('email','')).strip().lower(); password=str(d.get('password',''))
 if not email or len(email)>254 or not d.get('fullName') or len(str(d.get('fullName')))>160 or len(password)<12 or len(password)>128:return jsonify(success=False,message='Name, valid email and password (12–128 characters) are required.'),400
 if user_by_email(email):return jsonify(success=False,message='Email already exists.'),409
 allowed_roles={'APPLICANT','STUDENT','LECTURER','HOD','REGISTRAR','ADMISSIONS_OFFICER','BURSAR','CONTENT_EDITOR','SUPPORT_OFFICER','ICT_ADMIN','ADMIN','SUPER_ADMIN'}
 requested_role=str(d.get('role','APPLICANT')).upper()
 actor=current_user() or {}
 if requested_role not in allowed_roles:return jsonify(success=False,message='Invalid role assignment.'),400
 if requested_role in {'SUPER_ADMIN','ADMIN','ICT_ADMIN'} and actor.get('role')!='SUPER_ADMIN':return jsonify(success=False,message='Only a super administrator can assign privileged roles.'),403
 u={'id':new_id(),'email':email,'fullName':str(d['fullName']).strip(),'passwordHash':generate_password_hash(password),'role':requested_role,'phone':d.get('phone'),'isActive':True,'isLocked':False,'failedLoginAttempts':0,'createdAt':now()};put_record('users',u);audit('USER_CREATED','USER',{'email':email},current_user());return jsonify(success=True,user={k:v for k,v in u.items() if k!='passwordHash'}),201
@portal_bp.patch('/users/<rid>/status')
@role_required('SUPER_ADMIN','ADMIN','ICT_ADMIN')
def user_status(rid):
 u=get_record('users',rid)
 if not u:return jsonify(success=False,message='User not found.'),404
 actor=current_user() or {}
 if str(actor.get('id'))==str(rid):return jsonify(success=False,message='You cannot change your own account status.'),400
 if u.get('role')=='SUPER_ADMIN' and actor.get('role')!='SUPER_ADMIN':return jsonify(success=False,message='Only a super administrator can change another super administrator status.'),403
 d=body();
 for k in ('isActive','isLocked'):
  if k in d:u[k]=bool(d[k])
 if not u.get('isLocked'):u['failedLoginAttempts']=0
 put_record('users',u);audit('USER_STATUS_UPDATED','USER',{'userId':rid},current_user());return jsonify(success=True,message='User status updated.')

# Admissions
@portal_bp.get('/admissions')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','ADMISSIONS_OFFICER')
def admissions(): return response_list('applications',filtered('applications'))
@portal_bp.get('/admissions/my-application')
@jwt_required()
def my_application():
 u=current_user(); a=next((x for x in all_records('applications') if str(x.get('userId'))==str((u or {}).get('id'))),None);return jsonify(success=True,application=a)
@portal_bp.post('/admissions/apply')
@jwt_required()
def apply():
 u=current_user(); d=body()
 if not u:return jsonify(success=False,message='User not found.'),404
 settings=get_record('settings','default') or {}
 if not settings.get('admissionsOpen',True):return jsonify(success=False,message='Admissions are currently closed.'),403
 if any(str(a.get('userId'))==str(u['id']) for a in all_records('applications')):return jsonify(success=False,message='An application already exists for this account.'),409
 allowed={'firstName','lastName','otherNames','gender','dob','phone','programmeId','stateOfOrigin','lga','residentialAddress','oLevelResults'}
 a={k:d[k] for k in allowed if k in d}
 if not a.get('firstName') or not a.get('lastName') or not a.get('programmeId') or not isinstance(a.get('oLevelResults',[]),list):return jsonify(success=False,message='Required application details are missing or invalid.'),400
 a.update(id=new_id(),userId=u['id'],applicationNumber='EDOCASTI/'+datetime.now().strftime('%Y')+'/'+secrets.token_hex(3).upper(),session=settings.get('currentSession','2025/2026'),status='SUBMITTED',submittedAt=now());a.setdefault('oLevelResults',[]);put_record('applications',a);audit('APPLICATION_SUBMITTED','ADMISSION',{'id':a['id']},u);return jsonify(success=True,application=a),201
@portal_bp.patch('/admissions/<rid>/decision')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','ADMISSIONS_OFFICER')
def admission_decision(rid):
 a=get_record('applications',rid)
 if not a:return jsonify(success=False,message='Application not found.'),404
 d=body(); status=d.get('status')
 if status not in ('UNDER_REVIEW','OFFERED','ACCEPTED','REJECTED','SUBMITTED'):return jsonify(success=False,message='Invalid admission decision.'),400
 a.update(status=status,screeningNotes=d.get('screeningNotes',a.get('screeningNotes')),reviewedBy=(current_user() or {}).get('id'),decisionAt=now());put_record('applications',a);audit('ADMISSION_DECISION','ADMISSION',{'id':rid,'status':status},current_user());return jsonify(success=True,application=a)
@portal_bp.post('/admissions/<rid>/accept-offer')
@jwt_required()
def accept_offer(rid):
 a=get_record('applications',rid);u=current_user()
 if not a:return jsonify(success=False,message='Application not found.'),404
 if str(a.get('userId'))!=str((u or {}).get('id')) and (u or {}).get('role') not in ('SUPER_ADMIN','ADMIN','REGISTRAR'):return jsonify(success=False,message='Forbidden.'),403
 if a.get('status')!='OFFERED':return jsonify(success=False,message='No offer is available to accept.'),400
 existing=next((s for s in all_records('students') if str(s.get('userId'))==str(a.get('userId'))),None)
 if existing:return jsonify(success=True,message='Offer already accepted.',student=existing)
 p=get_record('programmes',a.get('programmeId')) or {}; dept=get_record('departments',p.get('departmentId')) or {}; sch=get_record('schools',dept.get('schoolId')) or {}
 s={'id':new_id(),'matricNumber':'EDO/'+datetime.now().strftime('%y')+'/'+secrets.token_hex(3).upper(),'userId':a.get('userId'),'programmeId':a.get('programmeId'),'departmentId':dept.get('id'),'schoolId':sch.get('id'),'level':'ND I','sessionAdmitted':a.get('session'),'academicStatus':'Good Standing','gender':a.get('gender',''),'dob':a.get('dob',''),'emergencyContact':a.get('phone',''),'nextOfKin':'','cgpa':0,'totalCreditsEarned':0};put_record('students',s);a['status']='ACCEPTED';a['decisionAt']=now();put_record('applications',a);return jsonify(success=True,message='Offer accepted.',student=s),201

# Students, registrations, results
@portal_bp.get('/students')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','LECTURER')
def students():return response_list('students',filtered('students'))
@portal_bp.get('/students/me')
@jwt_required()
def student_me():
 u=current_user();s=next((x for x in all_records('students') if str(x.get('userId'))==str((u or {}).get('id'))),None);return jsonify(success=True,student=s)
@portal_bp.get('/registrations')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','LECTURER','HOD')
def registrations():return response_list('registrations',filtered('registrations'))
@portal_bp.get('/registrations/my-registration')
@jwt_required()
def my_registration():
 u=current_user();s=next((x for x in all_records('students') if str(x.get('userId'))==str((u or {}).get('id'))),None);r=next((x for x in all_records('registrations') if s and str(x.get('studentId'))==str(s.get('id'))),None);return jsonify(success=True,registration=r)
@portal_bp.post('/registrations/register')
@jwt_required()
def register_courses():
 u=current_user();s=next((x for x in all_records('students') if str(x.get('userId'))==str((u or {}).get('id'))),None)
 if not s:return jsonify(success=False,message='Student profile not found.'),404
 settings=get_record('settings','default') or {}
 if not settings.get('courseRegistrationOpen',True):return jsonify(success=False,message='Course registration is closed.'),403
 d=body(); ids=d.get('courseIds') or []; courses=[c for c in all_records('courses') if c.get('id') in ids]
 if len(courses)!=len(set(ids)):return jsonify(success=False,message='One or more selected courses were not found.'),400
 total=sum(int(c.get('creditUnits',0)) for c in courses)
 if total>24:return jsonify(success=False,message='Maximum permitted credit load is 24 units.'),400
 r={'id':new_id(),'studentId':s['id'],'session':settings.get('currentSession','2025/2026'),'semester':settings.get('currentSemester','First Semester'),'level':s.get('level'),'courseIds':ids,'totalCredits':total,'status':'SUBMITTED','createdAt':now()};put_record('registrations',r);return jsonify(success=True,registration=r),201
@portal_bp.patch('/registrations/<rid>/approve')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','HOD')
def approve_registration(rid):
 r=get_record('registrations',rid)
 if not r:return jsonify(success=False,message='Registration not found.'),404
 r.update(status='APPROVED_BY_HOD',approvedAt=now(),approvedBy=(current_user() or {}).get('id'));put_record('registrations',r);return jsonify(success=True,registration=r)
@portal_bp.get('/results')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','LECTURER','HOD')
def results():return response_list('results',filtered('results'))
@portal_bp.get('/results/my-results')
@jwt_required()
def my_results():
 u=current_user();s=next((x for x in all_records('students') if str(x.get('userId'))==str((u or {}).get('id'))),None);rows=[r for r in all_records('results') if s and str(r.get('studentId'))==str(s.get('id')) and r.get('status')=='PUBLISHED'];return response_list('results',rows)
@portal_bp.post('/results/score-entry')
@role_required('SUPER_ADMIN','ADMIN','LECTURER')
def score_entry():
 d=body()
 try: ca=float(d.get('caScore',0)); exam=float(d.get('examScore',0))
 except (TypeError,ValueError):return jsonify(success=False,message='Scores must be numeric.'),400
 settings=get_record('settings','default') or {}; ca_max=float(settings.get('caMaxMarks',40)); ex_max=float(settings.get('examMaxMarks',60))
 if ca<0 or ca>ca_max or exam<0 or exam>ex_max:return jsonify(success=False,message='Score exceeds configured limits.'),400
 total=ca+exam; grade='A' if total>=70 else 'B' if total>=60 else 'C' if total>=50 else 'D' if total>=45 else 'E' if total>=40 else 'F'; gp={'A':5,'B':4,'C':3,'D':2,'E':1,'F':0}[grade]
 if not d.get('studentId') or not get_record('students',d.get('studentId')):return jsonify(success=False,message='A valid student record is required.'),400
 if not d.get('courseId') or not get_record('courses',d.get('courseId')):return jsonify(success=False,message='A valid course record is required.'),400
 r=dict(d);r.update(id=new_id(),caScore=ca,examScore=exam,totalScore=total,grade=grade,gradePoint=gp,status='SUBMITTED',submittedBy=(current_user() or {}).get('id'));put_record('results',r);return jsonify(success=True,result=r),201
@portal_bp.patch('/results/<rid>/publish')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','HOD')
def publish_result(rid):
 r=get_record('results',rid)
 if not r:return jsonify(success=False,message='Result not found.'),404
 r.update(status='PUBLISHED',publishedAt=now(),approvedBy=(current_user() or {}).get('id'));put_record('results',r);audit('RESULT_PUBLISHED','RESULT',{'id':rid},current_user());return jsonify(success=True,result=r)

# Finance, attendance, support
@portal_bp.get('/finance/fee-schedules')
def fee_schedules():return response_list('feeSchedules',filtered('feeSchedules'))
@portal_bp.get('/finance/invoices')
@jwt_required()
def invoices():
 u=current_user(); rows=filtered('invoices')
 if (u or {}).get('role') not in ('SUPER_ADMIN','ADMIN','BURSAR','REGISTRAR'):
  s=next((x for x in all_records('students') if str(x.get('userId'))==str((u or {}).get('id'))),None);rows=[x for x in rows if s and str(x.get('studentId'))==str(s.get('id'))]
 return response_list('invoices',rows)
@portal_bp.post('/finance/pay')
@jwt_required()
def pay_invoice():
 d=body(); inv=get_record('invoices',d.get('invoiceId'))
 if not inv:return jsonify(success=False,message='Invoice not found.'),404
 u=current_user();s=next((x for x in all_records('students') if str(x.get('userId'))==str((u or {}).get('id'))),None)
 if (u or {}).get('role') not in ('SUPER_ADMIN','ADMIN','BURSAR') and (not s or str(inv.get('studentId'))!=str(s.get('id'))):return jsonify(success=False,message='Forbidden.'),403
 due=max(0,float(inv.get('amount',0))-float(inv.get('amountPaid',0)))
 if due<=0:return jsonify(success=False,message='Invoice is already paid.'),400
 p={'id':new_id(),'reference':'EDO-'+secrets.token_hex(6).upper(),'invoiceId':inv['id'],'studentId':inv.get('studentId'),'amount':due,'channel':d.get('channel','Bank Transfer'),'status':'PENDING','providerReference':'','paidAt':now()};put_record('payments',p);return jsonify(success=True,transaction=p,invoice=inv),201
@portal_bp.get('/finance/payments')
@role_required('SUPER_ADMIN','ADMIN','BURSAR','REGISTRAR')
def payments():return response_list('payments',filtered('payments'))
@portal_bp.get('/attendance')
@role_required('SUPER_ADMIN','ADMIN','LECTURER','HOD','REGISTRAR')
def attendance():return response_list('attendance',filtered('attendance'))
@portal_bp.post('/attendance')
@role_required('SUPER_ADMIN','ADMIN','LECTURER')
def record_attendance():
 d=body();d['id']=new_id();d.setdefault('date',now()[:10]);d.setdefault('records',[]);return jsonify(success=True,session=put_record('attendance',d)),201
@portal_bp.get('/support')
@jwt_required()
def support_list():
 rows=all_records('supportTickets');u=current_user()
 if (u or {}).get('role') not in ('SUPER_ADMIN','ADMIN','ICT_ADMIN','SUPPORT_OFFICER'):rows=[x for x in rows if str(x.get('userId'))==str((u or {}).get('id'))]
 return response_list('tickets',rows)
@portal_bp.post('/support')
@jwt_required()
def support_create():
 d=body();u=current_user();d.update(id=new_id(),ticketNumber='TKT-'+secrets.token_hex(4).upper(),userId=(u or {}).get('id'),userName=(u or {}).get('fullName'),userEmail=(u or {}).get('email'),status='OPEN',messages=[{'id':new_id(),'message':d.get('message',''),'senderId':(u or {}).get('id'),'senderName':(u or {}).get('fullName'),'createdAt':now()}],createdAt=now());return jsonify(success=True,ticket=put_record('supportTickets',d)),201
@portal_bp.post('/support/<rid>/reply')
@jwt_required()
def support_reply(rid):
 t=get_record('supportTickets',rid);u=current_user();d=body()
 if not t:return jsonify(success=False,message='Ticket not found.'),404
 if str(t.get('userId'))!=str((u or {}).get('id')) and (u or {}).get('role') not in ('SUPER_ADMIN','ADMIN','ICT_ADMIN','SUPPORT_OFFICER'):return jsonify(success=False,message='Forbidden.'),403
 msg=str(d.get('message','')).strip()
 if not msg:return jsonify(success=False,message='Message is required.'),400
 t.setdefault('messages',[]).append({'id':new_id(),'message':msg,'senderId':(u or {}).get('id'),'senderName':(u or {}).get('fullName'),'createdAt':now()});put_record('supportTickets',t);return jsonify(success=True,ticket=t)
@portal_bp.get('/audit')
@role_required('SUPER_ADMIN','ADMIN','ICT_ADMIN','REGISTRAR')
def audit_logs():return response_list('logs',filtered('auditLogs'))
@portal_bp.get('/dashboard/stats')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','BURSAR','HOD')
def dashboard_stats():
 users=all_records('users'); apps=all_records('applications'); students=all_records('students'); inv=all_records('invoices'); payments=all_records('payments')
 return jsonify(success=True,stats={'totalUsers':len(users),'totalStudents':len(students),'totalApplicants':len(apps),'pendingApplications':sum(a.get('status') in ('SUBMITTED','UNDER_REVIEW') for a in apps),'totalCourses':len(all_records('courses')),'totalRevenue':sum(float(x.get('amount',0)) for x in payments if x.get('status')=='VERIFIED'),'outstandingFees':sum(max(0,float(x.get('amount',0))-float(x.get('amountPaid',0))) for x in inv),'recentAuditLogs':sorted(all_records('auditLogs'),key=lambda x:x.get('timestamp',''),reverse=True)[:8]})

# CMS
@portal_bp.get('/cms/news')
def news_list():
 rows=filtered('newsArticles')
 actor=None
 try:
  from flask_jwt_extended import verify_jwt_in_request
  verify_jwt_in_request(optional=True)
  actor=current_user() if get_jwt_identity() else None
 except Exception:
  actor=None
 can_manage=bool(actor and actor.get('role') in {'SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN'} and actor.get('isActive',True) and not actor.get('isLocked',False))
 if not can_manage:
  rows=[x for x in rows if str(x.get('status','')).upper()=='PUBLISHED']
 elif request.args.get('status'):
  rows=[x for x in rows if x.get('status')==request.args['status']]
 if request.args.get('sliderOnly','').lower()=='true':rows=[x for x in rows if x.get('isFeaturedInSlider')]
 return response_list('articles',rows)
@portal_bp.get('/cms/news/<rid>')
def news_get(rid):
 a=get_record('newsArticles',rid) or next((x for x in all_records('newsArticles') if x.get('slug')==rid),None)
 if not a:return jsonify(success=False,message='Article not found.'),404
 actor=None
 try:
  from flask_jwt_extended import verify_jwt_in_request
  verify_jwt_in_request(optional=True)
  actor=current_user() if get_jwt_identity() else None
 except Exception:
  actor=None
 can_manage=bool(actor and actor.get('role') in {'SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN'} and actor.get('isActive',True) and not actor.get('isLocked',False))
 if str(a.get('status','')).upper()!='PUBLISHED' and not can_manage:
  return jsonify(success=False,message='Article not found.'),404
 # Avoid a write transaction on every public GET; view analytics should be tracked separately.
 return jsonify(success=True,article=a)
@portal_bp.post('/cms/news')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def news_create():
 d=body()
 if not d.get('title') or not d.get('content'):return jsonify(success=False,message='Title and content are required.'),400
 d.update(id=new_id(),slug=d.get('slug') or '-'.join(str(d['title']).lower().split()),author=(current_user() or {}).get('fullName'),views=0,publishedAt=d.get('publishedAt') or now());d.setdefault('status','DRAFT');d.setdefault('isFeaturedInSlider',False);return jsonify(success=True,article=put_record('newsArticles',d)),201
@portal_bp.put('/cms/news/<rid>')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def news_update(rid):
 a=get_record('newsArticles',rid)
 if not a:return jsonify(success=False,message='Article not found.'),404
 a.update(body());a['id']=rid;put_record('newsArticles',a);return jsonify(success=True,article=a)
@portal_bp.delete('/cms/news/<rid>')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def news_delete(rid):
 if not remove_record('newsArticles',rid):return jsonify(success=False,message='Article not found.'),404
 return jsonify(success=True,message='Article deleted.')
@portal_bp.patch('/cms/news/<rid>/toggle-slider')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def news_toggle(rid):
 a=get_record('newsArticles',rid)
 if not a:return jsonify(success=False,message='Article not found.'),404
 a['isFeaturedInSlider']=not bool(a.get('isFeaturedInSlider'));put_record('newsArticles',a);return jsonify(success=True,isFeaturedInSlider=a['isFeaturedInSlider'])
@portal_bp.get('/cms/slides')
def slides_list():
 rows=filtered('sliderSlides')
 actor=None
 try:
  from flask_jwt_extended import verify_jwt_in_request
  verify_jwt_in_request(optional=True)
  actor=current_user() if get_jwt_identity() else None
 except Exception:
  actor=None
 can_manage=bool(actor and actor.get('role') in {'SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN'} and actor.get('isActive',True) and not actor.get('isLocked',False))
 if not can_manage or request.args.get('activeOnly','').lower()=='true':rows=[x for x in rows if x.get('isActive')]
 return response_list('slides',sorted(rows,key=lambda x:x.get('order',0)))
@portal_bp.post('/cms/slides')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def slides_create():
 d=body();d['id']=new_id();d.setdefault('isActive',True);d.setdefault('order',len(all_records('sliderSlides')));return jsonify(success=True,slide=put_record('sliderSlides',d)),201
@portal_bp.put('/cms/slides/<rid>')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def slides_update(rid):
 s=get_record('sliderSlides',rid)
 if not s:return jsonify(success=False,message='Slide not found.'),404
 s.update(body());s['id']=rid;put_record('sliderSlides',s);return jsonify(success=True,slide=s)
@portal_bp.delete('/cms/slides/<rid>')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def slides_delete(rid):
 if not remove_record('sliderSlides',rid):return jsonify(success=False,message='Slide not found.'),404
 return jsonify(success=True,message='Slide deleted.')

@portal_bp.errorhandler(404)
def not_found(_): return jsonify(success=False,message='API endpoint or record not found.'),404
