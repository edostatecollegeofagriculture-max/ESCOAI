import math
import hashlib
import os, json, uuid, secrets, string
from datetime import datetime, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import check_password_hash, generate_password_hash
from app.extensions import db, limiter
from sqlalchemy.exc import IntegrityError
from app.models.portal_record import PortalRecord

portal_bp = Blueprint('portal', __name__, url_prefix='/api/v1')
COLLECTIONS = {
 'users':'users','schools':'schools','departments':'departments','programmes':'programmes','courses':'courses',
 'applications':'applications','students':'students','registrations':'registrations','results':'results',
 'feeSchedules':'feeSchedules','invoices':'invoices','payments':'payments','attendance':'attendance',
 'supportTickets':'supportTickets','auditLogs':'auditLogs','courseAssignments':'courseAssignments','newsArticles':'newsArticles','sliderSlides':'sliderSlides','leadershipProfiles':'leadershipProfiles','portalFaqs':'portalFaqs','academicCalendar':'academicCalendar'
}
DOCUMENT_DEFAULTS = {
    'institutionLogoUrl': '',
    'faviconUrl': '',
    'idCard': {
        'frontBg': 'linear-gradient(135deg, #064e3b, #065f46, #0f172a)',
        'backBg': 'linear-gradient(135deg, #0f172a, #022c22, #0f172a)',
        'accentColor': '#f59e0b',
        'textColor': '#ffffff',
        'showWatermark': True,
        'watermarkText': 'EDOCASTI',
        'showPhotoBorder': True,
        'photoBorderColor': '#fbbf24',
        'shortName': 'EDOCASTI',
        'institutionName': 'Edo State College of Agric, Sci & Tech',
    },
    'admissionLetter': {
        'accentColor': '#065f46',
        'signatureImageUrl': '',
        'signatureName': 'Barr. Itohan Edokpayi',
        'signatureTitle': 'Registrar, EDOCASTI',
        'sealImageUrl': '',
        'showSeal': True,
        'footerNote': 'Verify via portal.edocasti.edu.ng',
        'greeting': 'Dear',
        'introParagraph': 'I am pleased to inform you that following your satisfactory performance in the admissions screening exercise, the Admissions Committee and the Academic Board have offered you provisional admission into the {institutionName} for the {currentSession} academic session.',
        'programmeDuration': '2 Academic Years (4 Semesters)',
        'studyLevel': 'ND I (Full-Time)',
        'schoolFaculty': 'School of Agricultural Technology',
        'conditionsTitle': 'Conditions of Admission:',
        'conditionsList': [
            'This offer is strictly provisional and subject to physical verification of your original WAEC/NECO certificates.',
            'Payment of acceptance fee must be completed within 14 days of offer publication to retain your admission quota.',
            'Any false declaration or presentation of forged credentials automatically nullifies this admission offer.'
        ],
        'title': 'Provisional Offer of Admission',
        'letterheadSubtext': 'IGUORIAKHI MAIN CAMPUS, EDO STATE, NIGERIA',
        'letterheadMotto': '"Excellence in Agriculture, Science & Technology"',
    },
}


def now(): return datetime.now(timezone.utc).isoformat()
def all_records(name):
 return [r.payload for r in PortalRecord.query.filter_by(collection=name).all()]
def get_record(name, key):
 r=PortalRecord.query.filter_by(collection=name, record_key=str(key)).first()
 return r.payload if r else None

def put_record(name, obj, commit=True, record_key=None):
    key = str(
        record_key if record_key is not None
        else (obj.get('id') or obj.get('email') or uuid.uuid4())
    )
    obj = dict(obj)
    obj.setdefault('id', key)

    record = PortalRecord.query.filter_by(
        collection=name,
        record_key=key
    ).first()

    if record:
        record.payload = obj
    else:
        db.session.add(
            PortalRecord(
                collection=name,
                record_key=key,
                payload=obj
            )
        )

    if commit:
        db.session.commit()

    return obj
def remove_record(name,key):
 r=PortalRecord.query.filter_by(collection=name,record_key=str(key)).first()
 if not r: return False
 db.session.delete(r); db.session.commit(); return True
LEGACY_ROLE_MAP = {
    'SUPER_ADMIN': ('SUPER_ADMIN', 'SYSTEM'),
    'ADMIN': ('ADMIN', 'INSTITUTION_ADMIN'),
    'INSTITUTION_ADMIN': ('ADMIN', 'INSTITUTION_ADMIN'),
    'RECTOR': ('ADMIN', 'RECTOR'),
    'REGISTRAR': ('ADMIN', 'REGISTRAR'),
    'ADMISSIONS_OFFICER': ('ADMIN', 'ADMISSIONS_OFFICER'),
    'EXAM_OFFICER': ('ADMIN', 'EXAM_OFFICER'),
    'BURSAR': ('ADMIN', 'BURSAR'),
    'CONTENT_EDITOR': ('ADMIN', 'CONTENT_EDITOR'),
    'ICT_ADMIN': ('ADMIN', 'ICT_ADMIN'),
    'SUPPORT_OFFICER': ('ADMIN', 'SUPPORT_OFFICER'),
    'DEAN': ('USER', 'DEAN'),
    'HOD': ('USER', 'HOD'),
    'LECTURER': ('USER', 'LECTURER'),
    'STUDENT': ('USER', 'STUDENT'),
    'APPLICANT': ('USER', 'APPLICANT'),
}


ADMIN_CATEGORIES = {
    'INSTITUTION_ADMIN',
    'RECTOR',
    'REGISTRAR',
    'ADMISSIONS_OFFICER',
    'EXAM_OFFICER',
    'BURSAR',
    'CONTENT_EDITOR',
    'ICT_ADMIN',
    'SUPPORT_OFFICER',
}

USER_CATEGORIES = {
    'DEAN',
    'HOD',
    'LECTURER',
    'STUDENT',
    'APPLICANT',
}

def normalize_user_record(user):
    if not user:
        return user

    normalized = dict(user)
    old_role = str(normalized.get('role', '')).upper()
    old_category = str(normalized.get('category', '')).upper()

    if old_role in LEGACY_ROLE_MAP:
        new_role, default_category = LEGACY_ROLE_MAP[old_role]
        normalized['role'] = new_role
        normalized['category'] = old_category or default_category
    else:
        normalized['role'] = old_role
        normalized['category'] = old_category or None

    if normalized != user:
        put_record('users', normalized)

    return normalized


def user_by_email(email):
    found = next(
        (
            u for u in all_records('users')
            if str(u.get('email', '')).strip().lower()
            == email.strip().lower()
        ),
        None
    )
    return normalize_user_record(found)


def current_user():
    ident = get_jwt_identity()
    user = get_record('users', ident)
    if not user:
        user = user_by_email(str(ident))
    return normalize_user_record(user)

def role_required(*roles):
    def deco(fn):
        @wraps(fn)
        @jwt_required()
        def wrapped(*args, **kwargs):
            u = current_user()

            if not u:
                return jsonify(success=False, message='User record not found.'), 401

            if not u.get('isActive', True):
                return jsonify(success=False, message='User account is deactivated.'), 403

            if u.get('isLocked', False):
                return jsonify(success=False, message='User account is locked.'), 403

            role = str(u.get('role', '')).upper()
            category = str(u.get('category', '')).upper()

            if role == 'SUPER_ADMIN':
                return fn(*args, **kwargs)

            route_categories = {
                str(item).upper()
                for item in roles
                if str(item).upper() not in {'SUPER_ADMIN', 'ADMIN', 'USER'}
            }

            allowed = False

            if role == 'ADMIN':
                if route_categories:
                    allowed = (
                        category in ADMIN_CATEGORIES
                        and category in route_categories
                    )
                else:
                    allowed = 'ADMIN' in roles

            elif role == 'USER':
                if route_categories:
                    allowed = (
                        category in USER_CATEGORIES
                        and category in route_categories
                    )
                else:
                    allowed = 'USER' in roles

            if not allowed:
                return jsonify(success=False, message='Insufficient permissions.'), 403

            return fn(*args, **kwargs)

        return wrapped
    return deco


def audit(action, resource, details=None, user=None, required=False):
    """Write an audit event; optionally fail the operation if logging fails."""
    user = user or {}
    audit_record = {
        'id': str(uuid.uuid4()),
        'timestamp': now(),
        'userId': user.get('id'),
        'userEmail': user.get('email'),
        'action': action,
        'resource': resource,
        'details': details or {},
        'ipAddress': request.remote_addr
    }
    try:
        if required:
            # Stage the audit event in the caller's transaction.
            # The critical route performs the final commit.
            put_record('auditLogs', audit_record, commit=False)
        else:
            # Preserve existing best-effort behavior for other audit calls.
            put_record('auditLogs', audit_record, commit=True)
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Failed to write audit log')
        if required:
            raise

def response_list(key, items): return jsonify(success=True, **{key:items})
def new_id(): return str(uuid.uuid4())
def body():
 data=request.get_json(silent=True)
 return data if isinstance(data,dict) else {}
def filtered(collection):
 rows=all_records(collection)
 for k,v in request.args.items():
  if k in ('search','q','activeOnly','sliderOnly','limit','offset'): continue
  if v: rows=[x for x in rows if str(x.get(k,'' )).lower()==v.lower()]
 q=request.args.get('search','').strip().lower()
 if q: rows=[x for x in rows if q in json.dumps(x,ensure_ascii=False).lower()]
 return rows

@portal_bp.get('/health')
def health(): return jsonify(status='UP',service='EDOCASTI Flask REST API',timestamp=now())

@portal_bp.post('/auth/logout')
@jwt_required()
def logout():
    actor = current_user() or {}
    token_data = get_jwt()
    jti = str(token_data.get('jti', '')).strip()

    if not actor.get('id') or not jti:
        return jsonify(success=False, message='Invalid authentication token.'), 401

    try:
        # Stage token revocation and audit logging in the same transaction.
        put_record(
            'jwtBlocklist',
            {
                'jti': jti,
                'userId': str(actor['id']),
                'revokedAt': now(),
                'expiresAt': token_data.get('exp')
            },
            commit=False,
            record_key=jti
        )

        audit(
            'LOGOUT',
            'AUTH',
            {'reason': 'User initiated logout'},
            actor,
            required=True
        )

        db.session.commit()

    except Exception:
        db.session.rollback()
        current_app.logger.exception('Logout revocation/audit failed')
        return jsonify(
            success=False,
            message='Unable to complete secure logout.'
        ), 500

    return jsonify(success=True, message='Logged out successfully.')


@portal_bp.post('/auth/login')
@limiter.limit('5 per minute; 30 per hour')
def login():
    d = body()
    email = str(d.get('email', '')).strip().lower()
    password = str(d.get('password', ''))

    if len(email) > 254 or len(password) > 128:
        return jsonify(success=False, message='Invalid email or password.'), 401

    if not email or not password:
        return jsonify(success=False, message='Email and password are required.'), 400

    u = user_by_email(email)

    if not u:
        audit('LOGIN_FAILED', 'AUTH', {'email': email, 'reason': 'User not found'})
        return jsonify(success=False, message='Invalid email or password.'), 401

    if u.get('isLocked'):
        return jsonify(success=False, message='Account is locked. Please contact the ICT Administrator.'), 403

    if not u.get('isActive', True):
        return jsonify(success=False, message='Account is deactivated.'), 403

    hashed = u.get('passwordHash') or u.get('password', '')
    valid = False

    try:
        if hashed.startswith(('$2a$', '$2b$', '$2y$')):
            import bcrypt
            valid = bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        else:
            valid = check_password_hash(hashed, password)
    except Exception:
        valid = False

    if not valid:
        u['failedLoginAttempts'] = int(u.get('failedLoginAttempts', 0)) + 1
        put_record('users', u)
        audit('LOGIN_FAILED_PASSWORD', 'AUTH', {'email': email}, u)
        return jsonify(success=False, message='Invalid email or password.'), 401

    u['failedLoginAttempts'] = 0
    u['lastLogin'] = now()
    put_record('users', u)
    audit('LOGIN_SUCCESS', 'AUTH', {}, u)

    role = u.get('role')
    category = u.get('category')

    token = create_access_token(
        identity=str(u['id']),
        additional_claims={
            'role': role,
            'category': category,
            'email': u.get('email'),
            'fullName': u.get('fullName')
        }
    )

    return jsonify(
        success=True,
        token=token,
        user={
            k: u.get(k)
            for k in (
                'id', 'email', 'fullName', 'role', 'category',
                'isActive', 'isLocked', 'phone'
            )
        }
    )


@portal_bp.post('/auth/dev-quick-login')
@limiter.limit('5 per minute')
def dev_quick_login():
    deployment_markers = (
        'RENDER',
        'VERCEL',
        'DYNO',
        'K_SERVICE',
        'AWS_EXECUTION_ENV',
        'WEBSITE_INSTANCE_ID',
        'FLY_APP_NAME',
        'RAILWAY_ENVIRONMENT',
        'HEROKU_APP_NAME'
    )

    deployed = any(
        os.environ.get(marker)
        for marker in deployment_markers
    )

    development_enabled = (
        current_app.config.get('APP_ENVIRONMENT') == 'development'
        and current_app.config.get('ENABLE_DEV_QUICK_LOGIN') is True
        and os.environ.get('FLASK_CONFIG', '').strip().lower() == 'development'
        and not deployed
        and not current_app.config.get('TESTING', False)
    )

    if not development_enabled:
        return jsonify(
            success=False,
            message='Development quick login is disabled.'
        ), 404

    d = body()
    requested_role = str(d.get('role', '')).strip().upper()

    accounts = {
        'SUPER_ADMIN': {
            'role': 'SUPER_ADMIN',
            'email': 'dev-superadmin@edocasti.local',
            'fullName': 'Temporary Development Super Admin',
            'category': 'SYSTEM'
        },
        'ADMIN': {
            'role': 'ADMIN',
            'email': 'dev-admin@edocasti.local',
            'fullName': 'Temporary Development Administrator',
            'category': 'INSTITUTION_ADMIN'
        },
        'USER': {
            'role': 'USER',
            'email': 'dev-user@edocasti.local',
            'fullName': 'Temporary Development User',
            'category': 'STUDENT'
        }
    }

    quick_login_categories = (
        'RECTOR', 'EXAM_OFFICER', 'STUDENT', 'APPLICANT',
        'DEAN', 'HOD', 'LECTURER', 'REGISTRAR', 'BURSAR'
    )

    for category in quick_login_categories:
        accounts[category] = {
            'role': 'ADMIN' if category in ADMIN_CATEGORIES else 'USER',
            'email': f"dev-{category.lower()}@edocasti.local",
            'fullName': f"Temporary Development {category.replace('_', ' ').title()}",
            'category': category
        }

    if requested_role not in accounts:
        return jsonify(
            success=False,
            message='Invalid development login role.'
        ), 400

    account = accounts[requested_role]
    email = account['email']
    user = user_by_email(email)

    if user:
        if not user.get('isDevQuickLogin'):
            return jsonify(
                success=False,
                message='Development account email is already in use.'
            ), 409

        user['role'] = account['role']
        user['category'] = account['category']

        if not user.get('isActive', True) or user.get('isLocked', False):
            return jsonify(
                success=False,
                message='Development account is unavailable.'
            ), 403

    else:
        temporary_password = secrets.token_urlsafe(48)

        user = {
            'id': str(uuid.uuid4()),
            'email': email,
            'fullName': account['fullName'],
            'passwordHash': generate_password_hash(temporary_password),
            'role': account['role'],
            'category': account['category'],
            'isActive': True,
            'isLocked': False,
            'isDevQuickLogin': True,
            'failedLoginAttempts': 0,
            'phone': '',
            'createdAt': now()
        }

    user['lastLogin'] = now()
    user['isDevQuickLogin'] = True
    put_record('users', user)

    token = create_access_token(
        identity=str(user['id']),
        additional_claims={
            'role': user['role'],
            'category': user['category'],
            'email': user.get('email'),
            'fullName': user.get('fullName')
        }
    )

    audit(
        'DEV_QUICK_LOGIN',
        'AUTH',
        {'role': account['role'], 'category': account['category']},
        user
    )

    return jsonify(
        success=True,
        token=token,
        user={
            key: user.get(key)
            for key in (
                'id', 'email', 'fullName', 'role', 'category',
                'isActive', 'isLocked', 'phone'
            )
        }
    )

@portal_bp.post('/auth/register-applicant')
@limiter.limit('3 per hour')
def register_applicant():
    d = body()
    email = str(d.get('email', '')).strip().lower()
    password = str(d.get('password', ''))
    name = str(d.get('fullName', '')).strip()

    if (
        not email or len(email) > 254
        or len(password) < 12 or len(password) > 128
        or not name or len(name) > 160
    ):
        return jsonify(
            success=False,
            message='Full name, valid email and a password of 12-128 characters are required.'
        ), 400

    if user_by_email(email):
        return jsonify(
            success=False,
            message='An account with this email already exists.'
        ), 409

    u = {
        'id': new_id(),
        'email': email,
        'passwordHash': generate_password_hash(password),
        'fullName': name,
        'role': 'USER',
        'category': 'APPLICANT',
        'phone': d.get('phone'),
        'isActive': True,
        'isLocked': False,
        'failedLoginAttempts': 0,
        'createdAt': now()
    }

    put_record('users', u)

    token = create_access_token(
        identity=str(u['id']),
        additional_claims={
            'role': u['role'],
            'category': u['category'],
            'email': email,
            'fullName': name
        }
    )

    return jsonify(
        success=True,
        token=token,
        user={
            k: u.get(k)
            for k in ('id', 'email', 'fullName', 'role', 'category')
        }
    ), 201


@portal_bp.get('/auth/me')
@jwt_required()
def me():
    u = current_user()

    if not u:
        return jsonify(success=False, message='User not found.'), 404

    return jsonify(
        success=True,
        user={
            k: u.get(k)
            for k in (
                'id', 'email', 'fullName', 'role', 'category',
                'isActive', 'isLocked', 'phone'
            )
        }
    )

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
 if len(new)<12 or len(new)>128:return jsonify(success=False,message='New password must contain 12-128 characters.'),400
 u['passwordHash']=generate_password_hash(new); put_record('users',u); audit('PASSWORD_CHANGED','AUTH',{},u)
 return jsonify(success=True,message='Password changed successfully.')

@portal_bp.get('/settings')
def get_settings():
 defaults={'id':'default','institutionName':'Edo State College of Agriculture, Science and Technology','shortName':'EDOCASTI','currentSession':'2025/2026','currentSemester':'First Semester','admissionsOpen':True,'courseRegistrationOpen':True,'caMaxMarks':40,'examMaxMarks':60}
 stored=get_record('settings','default') or {}
 public_keys={'id','institutionName','shortName','logoUrl','faviconUrl','currentSession','currentSemester','admissionsOpen','courseRegistrationOpen','caMaxMarks','examMaxMarks','contactEmail','contactPhone','address','website','theme'}
 docs = {**DOCUMENT_DEFAULTS, **(stored.get('documents') or {})}
 for _k in ('idCard','admissionLetter'):
  docs[_k] = {**DOCUMENT_DEFAULTS[_k], **(docs.get(_k) or {})}
 return jsonify(success=True, settings={**defaults, **{k:v for k,v in stored.items() if k in public_keys}, 'documents': docs})
@portal_bp.put('/settings')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR')
def update_settings():
 d=body(); allowed={'institutionName','shortName','logoUrl','faviconUrl','currentSession','currentSemester','admissionsOpen','courseRegistrationOpen','caMaxMarks','examMaxMarks','contactEmail','contactPhone','address','website','theme','documents'}; d={k:v for k,v in d.items() if k in allowed}; old=get_record('settings','default') or {'id':'default'}; old.update(d); old['id']='default'; put_record('settings',old); audit('SETTINGS_UPDATED','SETTINGS',{},current_user()); return jsonify(success=True,settings={k:v for k,v in old.items() if k in allowed | {'id'}})

# Academic collections
@portal_bp.get('/academics/schools')
def schools(): return response_list('schools',all_records('schools'))
@portal_bp.post('/academics/schools')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR')
def create_school():
    d = body()
    if not d.get('code') or not d.get('name'):
        return jsonify(success=False, message='School code and name are required.'), 400
    d['id'] = new_id()
    d.setdefault('status', 'ACTIVE')
    school = put_record('schools', d)
    audit('SCHOOL_CREATED', 'SCHOOL', {'id': school['id'], 'name': school.get('name')}, current_user())
    return jsonify(success=True, school=school), 201

@portal_bp.get('/academics/departments')
def departments(): return response_list('departments',all_records('departments'))
@portal_bp.post('/academics/departments')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR')
def create_department():
    d = body()

    code = str(d.get('code') or '').strip()
    name = str(d.get('name') or '').strip()
    school_id = str(d.get('schoolId') or '').strip()

    if not code or not name or not school_id:
        return jsonify(success=False, message='Department code, name and school are required.'), 400

    school = get_record('schools', school_id)

    if not school:
        return jsonify(success=False, message='Selected school was not found.'), 404

    if str(school.get('status', 'ACTIVE')).upper() != 'ACTIVE':
        return jsonify(success=False, message='Selected school is not active.'), 400

    duplicate = any(
        str(item.get('schoolId')) == school_id
        and str(item.get('code') or '').strip().casefold() == code.casefold()
        for item in all_records('departments')
    )

    if duplicate:
        return jsonify(success=False, message='A department with this code already exists in the selected school.'), 409

    department = {
        'id': new_id(),
        'schoolId': school_id,
        'code': code,
        'name': name,
        'description': str(d.get('description') or '').strip(),
        'status': 'ACTIVE'
    }

    put_record('departments', department)

    audit(
        'DEPARTMENT_CREATED',
        'DEPARTMENT',
        {
            'id': department['id'],
            'schoolId': school_id,
            'code': code,
            'name': name
        },
        current_user()
    )

    return jsonify(success=True, department=department), 201


@portal_bp.post('/academics/programmes')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR')
def create_programme():
    d = body()

    code = str(d.get('code') or '').strip()
    name = str(d.get('name') or '').strip()
    department_id = str(d.get('departmentId') or '').strip()

    if not code or not name or not department_id:
        return jsonify(success=False, message='Programme code, name and department are required.'), 400

    department = get_record('departments', department_id)

    if not department:
        return jsonify(success=False, message='Selected department was not found.'), 404

    if str(department.get('status', 'ACTIVE')).upper() != 'ACTIVE':
        return jsonify(success=False, message='Selected department is not active.'), 400

    school = get_record('schools', department.get('schoolId'))

    if not school:
        return jsonify(success=False, message='The department school could not be found.'), 404

    if str(school.get('status', 'ACTIVE')).upper() != 'ACTIVE':
        return jsonify(success=False, message='The department school is not active.'), 400

    duplicate = any(
        str(item.get('departmentId')) == department_id
        and str(item.get('code') or '').strip().casefold() == code.casefold()
        for item in all_records('programmes')
    )

    if duplicate:
        return jsonify(success=False, message='A programme with this code already exists in the selected department.'), 409

    qualification_input = str(d.get('qualification') or '').strip().upper()

    qualification_map = {
        'ND': 'ND',
        'HND': 'HND',
        'CERTIFICATE': 'Certificate'
    }

    if qualification_input not in qualification_map:
        return jsonify(success=False, message='Qualification must be ND, HND or Certificate.'), 400

    try:
        duration_years = int(d.get('durationYears'))
    except (TypeError, ValueError):
        return jsonify(success=False, message='Programme duration must be a whole number.'), 400

    if duration_years < 1 or duration_years > 10:
        return jsonify(success=False, message='Programme duration must be between 1 and 10 years.'), 400

    requirements = d.get('requirements') or []

    if isinstance(requirements, str):
        requirements = [item.strip() for item in requirements.split(',') if item.strip()]

    if not isinstance(requirements, list) or not all(isinstance(item, str) for item in requirements):
        return jsonify(success=False, message='Programme requirements must be a list of text items.'), 400

    programme = {
        'id': new_id(),
        'departmentId': department_id,
        'code': code,
        'name': name,
        'qualification': qualification_map[qualification_input],
        'durationYears': duration_years,
        'description': str(d.get('description') or '').strip(),
        'requirements': [item.strip() for item in requirements if item.strip()],
        'status': 'ACTIVE'
    }

    put_record('programmes', programme)

    audit(
        'PROGRAMME_CREATED',
        'PROGRAMME',
        {
            'id': programme['id'],
            'departmentId': department_id,
            'code': code,
            'name': name
        },
        current_user()
    )

    return jsonify(success=True, programme=programme), 201

@portal_bp.get('/academics/programmes')
def programmes(): return response_list('programmes',all_records('programmes'))
@portal_bp.get('/academics/courses')
def list_courses(): return response_list('courses',filtered('courses'))
@portal_bp.post('/academics/courses')
@role_required('SUPER_ADMIN','INSTITUTION_ADMIN','REGISTRAR','EXAM_OFFICER')
def create_course():
    d = body()
    code = str(d.get('code') or '').strip()
    title = str(d.get('title') or '').strip()

    if not code or not title:
        return jsonify(
            success=False,
            message='Course code and title are required.'
        ), 400

    if any(
        str(x.get('code', '')).strip().lower() == code.lower()
        for x in all_records('courses')
    ):
        return jsonify(
            success=False,
            message='Course code already exists.'
        ), 409

    department_id = str(d.get('departmentId') or '').strip() or None

    if department_id:
        department = get_record('departments', department_id)

        if not department:
            return jsonify(
                success=False,
                message='The selected department does not exist.'
            ), 400

        school_id = department.get('schoolId')

        if not school_id or not get_record('schools', school_id):
            return jsonify(
                success=False,
                message='The selected department has no valid school.'
            ), 400

        supplied_school_id = str(d.get('schoolId') or '').strip()

        if supplied_school_id and supplied_school_id != str(school_id):
            return jsonify(
                success=False,
                message='The selected department does not belong to the selected school.'
            ), 400

        d['schoolId'] = school_id

    d['code'] = code
    d['title'] = title
    d['departmentId'] = department_id
    d['id'] = new_id()

    course = put_record('courses', d)
    audit('COURSE_CREATED', 'COURSE', {'id': course['id']}, current_user())

    return jsonify(success=True, course=course), 201


@portal_bp.get('/academics/course-assignments')
@role_required(
    'SUPER_ADMIN', 'INSTITUTION_ADMIN', 'REGISTRAR', 'HOD'
)
def list_course_assignments():
    actor = current_user() or {}
    category = str(actor.get('category', '')).upper()
    rows = all_records('courseAssignments')

    if category == 'HOD':
        department_id = actor.get('departmentId')

        if not department_id:
            return jsonify(
                success=False,
                message='Your HOD account has no assigned department.'
            ), 403

        rows = [
            item for item in rows
            if str(item.get('departmentId')) == str(department_id)
        ]

    return response_list('courseAssignments', rows)


@portal_bp.post('/academics/course-assignments')
@role_required(
    'SUPER_ADMIN', 'INSTITUTION_ADMIN', 'REGISTRAR', 'HOD'
)
def create_course_assignment():
    actor = current_user() or {}
    category = str(actor.get('category', '')).upper()

    if (
        actor.get('role') != 'SUPER_ADMIN'
        and category not in {
            'INSTITUTION_ADMIN', 'REGISTRAR', 'HOD'
        }
    ):
        return jsonify(
            success=False,
            message='You are not authorized to assign lecturers.'
        ), 403

    d = body()
    lecturer_id = str(d.get('lecturerId') or '').strip()
    course_id = str(d.get('courseId') or '').strip()

    if not lecturer_id or not course_id:
        return jsonify(
            success=False,
            message='Lecturer and course are required.'
        ), 400

    lecturer = get_record('users', lecturer_id)

    if not lecturer:
        return jsonify(
            success=False,
            message='Lecturer account not found.'
        ), 404

    lecturer = normalize_user_record(lecturer)

    if (
        lecturer.get('category') != 'LECTURER'
        or not lecturer.get('isActive', True)
        or lecturer.get('isLocked', False)
    ):
        return jsonify(
            success=False,
            message='The selected account is not an active lecturer.'
        ), 400

    course = get_record('courses', course_id)

    if not course:
        return jsonify(
            success=False,
            message='Course not found.'
        ), 404

    department_id = str(course.get('departmentId') or '').strip()

    if not department_id:
        return jsonify(
            success=False,
            message='This course has no department. Associate it with a department before assigning a lecturer.'
        ), 400

    if str(lecturer.get('departmentId') or '') != department_id:
        return jsonify(
            success=False,
            message='The lecturer and course must belong to the same department.'
        ), 403

    if category == 'HOD':
        hod_department = str(actor.get('departmentId') or '')

        if not hod_department or hod_department != department_id:
            return jsonify(
                success=False,
                message='HODs may only assign courses within their own department.'
            ), 403

    settings = get_record('settings', 'default') or {}
    session = str(
        d.get('session') or settings.get('currentSession', '2025/2026')
    ).strip()
    semester = str(
        d.get('semester') or settings.get(
            'currentSemester', 'First Semester'
        )
    ).strip()

    if not session or not semester:
        return jsonify(
            success=False,
            message='A valid academic session and semester are required.'
        ), 400

    duplicate = next(
        (
            item for item in all_records('courseAssignments')
            if str(item.get('lecturerId')) == lecturer_id
            and str(item.get('courseId')) == course_id
            and str(item.get('session')) == session
            and str(item.get('semester')) == semester
            and str(item.get('status', 'ACTIVE')).upper() == 'ACTIVE'
        ),
        None
    )

    if duplicate:
        return jsonify(
            success=False,
            message='This lecturer is already assigned to this course for the selected session and semester.'
        ), 409

    assignment = {
        'id': new_id(),
        'lecturerId': lecturer_id,
        'courseId': course_id,
        'departmentId': department_id,
        'session': session,
        'semester': semester,
        'status': 'ACTIVE',
        'assignedBy': actor.get('id'),
        'assignedAt': now()
    }

    put_record('courseAssignments', assignment)

    audit(
        'COURSE_LECTURER_ASSIGNED',
        'COURSE_ASSIGNMENT',
        {
            'assignmentId': assignment['id'],
            'lecturerId': lecturer_id,
            'courseId': course_id,
            'departmentId': department_id
        },
        actor
    )

    return jsonify(
        success=True,
        assignment=assignment
    ), 201

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
@role_required('SUPER_ADMIN', 'ADMIN')
def list_users():
 rows=filtered('users'); role=request.args.get('role')
 if role: rows=[u for u in rows if u.get('role')==role]
 return response_list('users',[{k:v for k,v in u.items() if k!='passwordHash'} for u in rows])
@portal_bp.post('/users')
@role_required('SUPER_ADMIN', 'ADMIN')
def create_user():
    d = body()

    email = str(d.get('email', '')).strip().lower()
    password = str(d.get('password', ''))
    full_name = str(d.get('fullName', '')).strip()

    if (
        not email or len(email) > 254
        or not full_name or len(full_name) > 160
        or len(password) < 12 or len(password) > 128
    ):
        return jsonify(
            success=False,
            message='Name, valid email and password (12-128 characters) are required.'
        ), 400

    if user_by_email(email):
        return jsonify(success=False, message='Email already exists.'), 409

    actor = current_user() or {}
    actor_role = str(actor.get('role', '')).upper()
    actor_category = str(actor.get('category', '')).upper()

    if actor_role != 'SUPER_ADMIN' and actor_category != 'INSTITUTION_ADMIN':
        return jsonify(
            success=False,
            message='Only Super Admin or Institution Admin can create accounts.'
        ), 403

    requested = str(
        d.get('category') or d.get('role') or 'APPLICANT'
    ).strip().upper()

    valid_categories = ADMIN_CATEGORIES | USER_CATEGORIES

    if requested == 'SUPER_ADMIN':
        if actor_role != 'SUPER_ADMIN':
            return jsonify(
                success=False,
                message='Only a Super Admin can create another Super Admin.'
            ), 403
        requested_role = 'SUPER_ADMIN'
        requested_category = 'SYSTEM'

    elif requested == 'SYSTEM':
        return jsonify(
            success=False,
            message='SYSTEM category is reserved for Super Admin accounts.'
        ), 400

    elif requested in valid_categories:
        requested_category = requested
        requested_role = (
            'ADMIN' if requested_category in ADMIN_CATEGORIES else 'USER'
        )

    elif requested in {'ADMIN', 'USER'}:
        return jsonify(
            success=False,
            message='Select a valid user category for this account.'
        ), 400

    else:
        return jsonify(
            success=False,
            message='Invalid user category.'
        ), 400

    department_id = str(d.get('departmentId') or '').strip() or None
    school_id = str(d.get('schoolId') or '').strip() or None

    if department_id:
        department = get_record('departments', department_id)

        if not department:
            return jsonify(
                success=False,
                message='The selected department does not exist.'
            ), 400

        department_school_id = department.get('schoolId')

        if not department_school_id:
            return jsonify(
                success=False,
                message='The selected department has no school association.'
            ), 400

        if school_id and str(school_id) != str(department_school_id):
            return jsonify(
                success=False,
                message='The selected department does not belong to the selected school.'
            ), 400

        school_id = str(department_school_id)

    if school_id and not get_record('schools', school_id):
        return jsonify(
            success=False,
            message='The selected school does not exist.'
        ), 400

    if requested_category in {'HOD', 'LECTURER'} and not department_id:
        return jsonify(
            success=False,
            message='A department must be assigned to this staff category.'
        ), 400

    if requested_category == 'DEAN' and not school_id:
        return jsonify(
            success=False,
            message='A school must be assigned to a Dean.'
        ), 400

    u = {
        'id': new_id(),
        'email': email,
        'fullName': full_name,
        'passwordHash': generate_password_hash(password),
        'role': requested_role,
        'category': requested_category,
        'departmentId': department_id,
        'schoolId': school_id,
        'phone': d.get('phone'),
        'isActive': True,
        'isLocked': False,
        'failedLoginAttempts': 0,
        'createdAt': now()
    }

    put_record('users', u)

    audit(
        'USER_CREATED',
        'USER',
        {
            'email': email,
            'role': requested_role,
            'category': requested_category
        },
        actor
    )

    return jsonify(
        success=True,
        user={
            k: v for k, v in u.items()
            if k != 'passwordHash'
        }
    ), 201

@portal_bp.patch('/users/<rid>/status')
@role_required('SUPER_ADMIN', 'ADMIN')
def user_status(rid):
    target = get_record('users', rid)

    if not target:
        return jsonify(success=False, message='User not found.'), 404

    target = normalize_user_record(target)
    actor = current_user() or {}
    actor_category = str(actor.get('category', '')).upper()

    if (
        actor.get('role') != 'SUPER_ADMIN'
        and actor_category != 'INSTITUTION_ADMIN'
    ):
        return jsonify(
            success=False,
            message='Only Super Admin or Institution Admin can change account status.'
        ), 403

    if str(actor.get('id')) == str(rid):
        return jsonify(
            success=False,
            message='You cannot change your own account status.'
        ), 400

    if (
        target.get('role') == 'SUPER_ADMIN'
        and actor.get('role') != 'SUPER_ADMIN'
    ):
        return jsonify(
            success=False,
            message='Only a Super Admin can change another Super Admin account.'
        ), 403

    d = body()
    allowed_fields = ('isActive', 'isLocked')
    changes = {
        key: d[key]
        for key in allowed_fields
        if key in d
    }

    if not changes:
        return jsonify(
            success=False,
            message='No valid account status changes supplied.'
        ), 400

    if any(not isinstance(value, bool) for value in changes.values()):
        return jsonify(
            success=False,
            message='Account status values must be true or false.'
        ), 400

    target.update(changes)

    if not target.get('isLocked'):
        target['failedLoginAttempts'] = 0

    put_record('users', target)

    audit(
        'USER_STATUS_UPDATED',
        'USER',
        {
            'userId': rid,
            'changes': changes
        },
        actor
    )

    return jsonify(
        success=True,
        message='User status updated.'
    )

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
 allowed={'firstName','lastName','otherNames','gender','dob','phone','programmeId','stateOfOrigin','lga','residentialAddress','oLevelResults','profileImageUrl'}
 a={k:d[k] for k in allowed if k in d}
 if not a.get('firstName') or not a.get('lastName') or not a.get('programmeId') or not isinstance(a.get('oLevelResults',[]),list):return jsonify(success=False,message='Required application details are missing or invalid.'),400
 a.update(id=new_id(),userId=u['id'],applicationNumber='EDOCASTI/'+datetime.now().strftime('%Y')+'/'+secrets.token_hex(3).upper(),session=settings.get('currentSession','2025/2026'),status='SUBMITTED',submittedAt=now());a.setdefault('oLevelResults',[]);put_record('applications',a);audit('APPLICATION_SUBMITTED','ADMISSION',{'id':a['id']},u);return jsonify(success=True,application=a),201
@portal_bp.patch('/admissions/<rid>/decision')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','ADMISSIONS_OFFICER')
def admission_decision(rid):
    application = get_record('applications', rid)
    if not application:
        return jsonify(success=False, message='Application not found.'), 404

    data = body()
    status = data.get('status')

    if status not in ('UNDER_REVIEW', 'OFFERED', 'ACCEPTED', 'REJECTED', 'SUBMITTED'):
        return jsonify(success=False, message='Invalid admission decision.'), 400

    actor = current_user() or {}
    student = None

    try:
        if status == 'OFFERED':
            user_id = application.get('userId')

            if not user_id:
                return jsonify(
                    success=False,
                    message='This application has no linked user account. A student record cannot be created.'
                ), 400

            student = next(
                (
                    item for item in all_records('students')
                    if (
                        str(item.get('applicationId')) == str(rid)
                        or (
                            str(item.get('userId')) == str(user_id)
                            and str(item.get('programmeId')) == str(application.get('programmeId'))
                            and str(item.get('sessionAdmitted')) == str(application.get('session'))
                        )
                    )
                ),
                None
            )

            if not student:
                programme = get_record('programmes', application.get('programmeId')) or {}
                department = get_record('departments', programme.get('departmentId')) or {}
                school = get_record('schools', department.get('schoolId')) or {}

                full_name = ' '.join(
                    str(application.get(field) or '').strip()
                    for field in ('firstName', 'otherNames', 'lastName')
                    if str(application.get(field) or '').strip()
                )

                student = {
                    'id': new_id(),
                    'applicationId': rid,
                    'fullName': full_name,
                    'matricNumber': 'EDO/' + datetime.now().strftime('%y') + '/' + secrets.token_hex(3).upper(),
                    'userId': user_id,
                    'programmeId': application.get('programmeId'),
                    'departmentId': department.get('id'),
                    'schoolId': school.get('id'),
                    'level': 'ND I',
                    'sessionAdmitted': application.get('session'),
                    'academicStatus': 'Good Standing',
                    'gender': application.get('gender', ''),
                    'dob': application.get('dob', ''),
                    'emergencyContact': application.get('phone', ''),
                    'nextOfKin': '',
                    'cgpa': 0,
                    'totalCreditsEarned': 0,
                    'profileImageUrl': application.get('profileImageUrl', '')
                }
            else:
                student = dict(student)
                student['applicationId'] = rid

            put_record('students', student, commit=False, record_key=student['id'])

        application.update(
            status=status,
            screeningNotes=data.get('screeningNotes', application.get('screeningNotes')),
            reviewedBy=actor.get('id'),
            decisionAt=now()
        )

        put_record('applications', application, commit=False, record_key=rid)

        audit(
            'ADMISSION_OFFER_ISSUED' if status == 'OFFERED' else 'ADMISSION_DECISION',
            'ADMISSION',
            {
                'applicationId': rid,
                'status': status,
                'studentId': student.get('id') if student else None,
                'studentCreatedOrLinked': bool(student) if status == 'OFFERED' else False
            },
            actor,
            required=True
        )

        db.session.commit()

        response = {
            'success': True,
            'application': application
        }

        if student:
            response['student'] = student
            response['message'] = 'Admission offered and student record created or linked successfully.'

        return jsonify(**response)

    except Exception:
        db.session.rollback()
        current_app.logger.exception('Admission decision/student creation transaction failed.')
        return jsonify(
            success=False,
            message='The admission decision could not be saved. No changes were committed.'
        ), 500
@portal_bp.post('/admissions/<rid>/accept-offer')
@jwt_required()
def accept_offer(rid):
    application = get_record('applications', rid)
    actor = current_user()

    if not application:
        return jsonify(success=False, message='Application not found.'), 404

    if (
        str(application.get('userId')) != str((actor or {}).get('id'))
        and (actor or {}).get('role') not in ('SUPER_ADMIN', 'ADMIN', 'REGISTRAR')
    ):
        return jsonify(success=False, message='Forbidden.'), 403

    existing = next(
        (
            item for item in all_records('students')
            if (
                str(item.get('applicationId')) == str(rid)
                or (
                    str(item.get('userId')) == str(application.get('userId'))
                    and str(item.get('programmeId')) == str(application.get('programmeId'))
                    and str(item.get('sessionAdmitted')) == str(application.get('session'))
                )
            )
        ),
        None
    )

    if existing:
        if application.get('status') != 'ACCEPTED':
            try:
                application['status'] = 'ACCEPTED'
                application['decisionAt'] = now()
                put_record('applications', application, commit=False, record_key=rid)

                # Flip the applicant's account category to STUDENT so
                # /auth/me and role_required reflect the new status for
                # already-linked student records.
                user_record = get_record('users', application.get('userId'))
                if user_record and str(user_record.get('category', '')).upper() != 'STUDENT':
                    user_record['category'] = 'STUDENT'
                    put_record('users', user_record, commit=False)

                audit(
                    'ADMISSION_OFFER_ACCEPTED',
                    'ADMISSION',
                    {
                        'applicationId': rid,
                        'studentId': existing.get('id'),
                        'programmeId': application.get('programmeId'),
                        'existingStudentReused': True
                    },
                    actor,
                    required=True
                )

                db.session.commit()
            except Exception:
                db.session.rollback()
                current_app.logger.exception('Admission acceptance update failed.')
                return jsonify(
                    success=False,
                    message='Could not complete admission acceptance.'
                ), 500

        return jsonify(
            success=True,
            message='Admission confirmed. Existing student record retained.',
            student=existing
        )

    if application.get('status') != 'OFFERED':
        return jsonify(success=False, message='No offer is available to accept.'), 400

    programme = get_record('programmes', application.get('programmeId')) or {}
    department = get_record('departments', programme.get('departmentId')) or {}
    school = get_record('schools', department.get('schoolId')) or {}

    student = {
        'id': new_id(),
        'applicationId': rid,
        'matricNumber': 'EDO/' + datetime.now().strftime('%y') + '/' + secrets.token_hex(3).upper(),
        'userId': application.get('userId'),
        'programmeId': application.get('programmeId'),
        'departmentId': department.get('id'),
        'schoolId': school.get('id'),
        'level': 'ND I',
        'sessionAdmitted': application.get('session'),
        'academicStatus': 'Good Standing',
        'gender': application.get('gender', ''),
        'dob': application.get('dob', ''),
        'emergencyContact': application.get('phone', ''),
        'nextOfKin': '',
        'cgpa': 0,
        'totalCreditsEarned': 0,
        'profileImageUrl': application.get('profileImageUrl', '')
    }

    application['status'] = 'ACCEPTED'
    application['decisionAt'] = now()

    try:
        put_record('students', student, commit=False)

        # Flip the applicant's account category to STUDENT so
        # /auth/me and role_required reflect the new status.
        user_record = get_record('users', application.get('userId'))
        if user_record and str(user_record.get('category', '')).upper() != 'STUDENT':
            user_record['category'] = 'STUDENT'
            put_record('users', user_record, commit=False)

        put_record('applications', application, commit=False)
        audit(
            'ADMISSION_OFFER_ACCEPTED',
            'ADMISSION',
            {
                'applicationId': rid,
                'studentId': student['id'],
                'programmeId': application.get('programmeId')
            },
            actor,
            required=True
        )
        db.session.commit()

    except Exception:
        db.session.rollback()
        current_app.logger.exception('Admission acceptance/audit transaction failed.')
        return jsonify(
            success=False,
            message='Could not accept the admission offer. Please try again.'
        ), 500

    return jsonify(success=True, message='Offer accepted.', student=student), 201
# Lecturer-specific course access and approved student roster
@portal_bp.get('/lecturer/courses')
@role_required('LECTURER')
def lecturer_courses():
    actor = current_user() or {}
    if str(actor.get('category', '')).upper() != 'LECTURER':
        return jsonify(success=False, message='Lecturer access required.'), 403

    settings = get_record('settings', 'default') or {}
    session = str(settings.get('currentSession', '2025/2026')).strip()
    semester = str(settings.get('currentSemester', 'First Semester')).strip()

    assignments = [
        item for item in all_records('courseAssignments')
        if str(item.get('lecturerId')) == str(actor.get('id'))
        and str(item.get('session', session)) == session
        and str(item.get('semester', semester)) == semester
        and str(item.get('status', 'ACTIVE')).upper() == 'ACTIVE'
    ]

    course_ids = {str(item.get('courseId')) for item in assignments}
    courses = [
        item for item in all_records('courses')
        if str(item.get('id')) in course_ids
    ]
    return response_list('courses', courses)


@portal_bp.get('/lecturer/course-roster')
@role_required('LECTURER')
def lecturer_course_roster():
    actor = current_user() or {}
    if str(actor.get('category', '')).upper() != 'LECTURER':
        return jsonify(success=False, message='Lecturer access required.'), 403

    course_id = str(request.args.get('courseId') or '').strip()
    if not course_id:
        return jsonify(success=False, message='courseId is required.'), 400

    settings = get_record('settings', 'default') or {}
    session = str(settings.get('currentSession', '2025/2026')).strip()
    semester = str(settings.get('currentSemester', 'First Semester')).strip()

    assigned = any(
        str(item.get('lecturerId')) == str(actor.get('id'))
        and str(item.get('courseId')) == course_id
        and str(item.get('session', session)) == session
        and str(item.get('semester', semester)) == semester
        and str(item.get('status', 'ACTIVE')).upper() == 'ACTIVE'
        for item in all_records('courseAssignments')
    )
    if not assigned:
        return jsonify(success=False, message='You are not assigned to this course.'), 403

    eligible_student_ids = set()
    for registration in all_records('registrations'):
        course_ids = registration.get('courseIds') or []
        if (
            str(registration.get('session')) == session
            and str(registration.get('semester')) == semester
            and str(registration.get('status', '')).upper() == 'APPROVED_BY_HOD'
            and course_id in {str(value) for value in course_ids}
        ):
            eligible_student_ids.add(str(registration.get('studentId')))

    students = [
        item for item in all_records('students')
        if str(item.get('id')) in eligible_student_ids
    ]
    return response_list('students', students)


# Students, registrations, results


# -----------------------------------------------------------------
# Super Admin: Student and Applicant Record Management
# Deletion preserves linked accounts and all related history.
# -----------------------------------------------------------------

@portal_bp.put('/students/<rid>')
@role_required('SUPER_ADMIN')
def super_admin_update_student(rid):
    student = get_record('students', rid)
    if not student:
        return jsonify(success=False, message='Student record not found.'), 404

    data = body()
    allowed = {
        'matricNumber', 'fullName', 'phone', 'profileImageUrl',
        'programmeId', 'departmentId', 'schoolId', 'level',
        'sessionAdmitted', 'academicStatus', 'gender', 'dob',
        'emergencyContact', 'nextOfKin', 'cgpa', 'totalCreditsEarned'
    }

    changes = {key: value for key, value in data.items() if key in allowed}
    if not changes:
        return jsonify(success=False, message='No editable student fields supplied.'), 400

    if 'academicStatus' in changes and changes['academicStatus'] not in (
        'Good Standing', 'Probation', 'Suspended', 'Graduated'
    ):
        return jsonify(success=False, message='Invalid academic status.'), 400

    if 'cgpa' in changes:
        try:
            cgpa = float(changes['cgpa'])
            if not 0 <= cgpa <= 5:
                raise ValueError()
            changes['cgpa'] = cgpa
        except (TypeError, ValueError):
            return jsonify(success=False, message='CGPA must be a number between 0 and 5.'), 400

    if 'totalCreditsEarned' in changes:
        try:
            credits = int(changes['totalCreditsEarned'])
            if credits < 0:
                raise ValueError()
            changes['totalCreditsEarned'] = credits
        except (TypeError, ValueError):
            return jsonify(success=False, message='Total credits must be a non-negative whole number.'), 400

    if 'matricNumber' in changes:
        matric = str(changes['matricNumber']).strip()
        if not matric:
            return jsonify(success=False, message='Matriculation number cannot be empty.'), 400
        duplicate = [
            item for item in all_records('students')
            if str(item.get('id')) != str(rid)
            and str(item.get('matricNumber', '')).lower() == matric.lower()
        ]
        if duplicate:
            return jsonify(success=False, message='That matriculation number is already in use.'), 409
        changes['matricNumber'] = matric

    try:
        student = dict(student)
        student.update(changes)
        put_record('students', student, commit=False, record_key=rid)
        actor = current_user() or {}
        audit(
            'UPDATE_STUDENT',
            'students',
            {
                'studentId': rid,
                'matricNumber': student.get('matricNumber'),
                'changedFields': sorted(changes.keys())
            },
            user=actor,
            required=True
        )
        db.session.commit()
        return jsonify(success=True, message='Student record updated successfully.', student=student)
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Student update/audit transaction failed.')
        return jsonify(success=False, message='Student update failed. No changes were saved.'), 500


@portal_bp.delete('/students/<rid>')
@role_required('SUPER_ADMIN')
def super_admin_delete_student(rid):
    record = PortalRecord.query.filter_by(
        collection='students',
        record_key=str(rid)
    ).first()

    if not record:
        return jsonify(success=False, message='Student record not found.'), 404

    student = dict(record.payload or {})
    try:
        db.session.delete(record)
        actor = current_user() or {}
        audit(
            'DELETE_STUDENT',
            'students',
            {
                'studentId': rid,
                'matricNumber': student.get('matricNumber'),
                'linkedUserAccountRetained': True,
                'academicFinancialAttendanceHistoryPreserved': True
            },
            user=actor,
            required=True
        )
        db.session.commit()
        return jsonify(
            success=True,
            message='Student record deleted. Linked account and historical records were retained.'
        )
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Student deletion/audit transaction failed.')
        return jsonify(success=False, message='Student deletion failed. No changes were saved.'), 500


@portal_bp.put('/admissions/<rid>')
@role_required('SUPER_ADMIN')
def super_admin_update_application(rid):
    application = get_record('applications', rid)
    if not application:
        return jsonify(success=False, message='Applicant record not found.'), 404

    data = body()
    allowed = {
        'firstName', 'lastName', 'otherNames', 'gender', 'dob',
        'phone', 'programmeId', 'stateOfOrigin', 'lga',
        'residentialAddress', 'oLevelResults', 'status', 'screeningNotes'
    }
    changes = {key: value for key, value in data.items() if key in allowed}

    if not changes:
        return jsonify(success=False, message='No editable applicant fields supplied.'), 400

    if 'status' in changes and changes['status'] not in (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'OFFERED', 'ACCEPTED', 'REJECTED'
    ):
        return jsonify(success=False, message='Invalid application status.'), 400

    if 'oLevelResults' in changes and not isinstance(changes['oLevelResults'], list):
        return jsonify(success=False, message='O-Level results must be a JSON array.'), 400

    try:
        application = dict(application)
        application.update(changes)
        put_record('applications', application, commit=False, record_key=rid)
        actor = current_user() or {}
        audit(
            'UPDATE_APPLICATION',
            'applications',
            {
                'applicationId': rid,
                'applicationNumber': application.get('applicationNumber'),
                'changedFields': sorted(changes.keys())
            },
            user=actor,
            required=True
        )
        db.session.commit()
        return jsonify(success=True, message='Applicant record updated successfully.', application=application)
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Applicant update/audit transaction failed.')
        return jsonify(success=False, message='Applicant update failed. No changes were saved.'), 500


@portal_bp.delete('/admissions/<rid>')
@role_required('SUPER_ADMIN')
def super_admin_delete_application(rid):
    record = PortalRecord.query.filter_by(
        collection='applications',
        record_key=str(rid)
    ).first()

    if not record:
        return jsonify(success=False, message='Applicant record not found.'), 404

    application = dict(record.payload or {})
    try:
        db.session.delete(record)
        actor = current_user() or {}
        audit(
            'DELETE_APPLICATION',
            'applications',
            {
                'applicationId': rid,
                'applicationNumber': application.get('applicationNumber'),
                'linkedUserAccountRetained': True
            },
            user=actor,
            required=True
        )
        db.session.commit()
        return jsonify(
            success=True,
            message='Applicant record deleted. The linked login account was retained.'
        )
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Applicant deletion/audit transaction failed.')
        return jsonify(success=False, message='Applicant deletion failed. No changes were saved.'), 500


@portal_bp.get('/students')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR')
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
    actor = current_user()
    student = next(
        (item for item in all_records('students')
         if str(item.get('userId')) == str((actor or {}).get('id'))),
        None
    )
    if not student:
        return jsonify(success=False, message='Student profile not found.'), 404

    settings = get_record('settings', 'default') or {}
    if not settings.get('courseRegistrationOpen', True):
        return jsonify(success=False, message='Course registration is closed.'), 403

    data = body()
    course_ids = data.get('courseIds') or []
    if not isinstance(course_ids, list):
        return jsonify(success=False, message='Invalid course selections.'), 400

    if len(course_ids) != len(set(course_ids)):
        return jsonify(success=False, message='Duplicate course selections are not allowed.'), 400

    courses = [item for item in all_records('courses') if item.get('id') in course_ids]
    if len(courses) != len(course_ids):
        return jsonify(success=False, message='One or more selected courses were not found.'), 400

    try:
        total = sum(int(item.get('creditUnits', 0)) for item in courses)
    except (TypeError, ValueError):
        return jsonify(success=False, message='Invalid course credit units.'), 400

    if total > 24:
        return jsonify(success=False, message='Maximum permitted credit load is 24 units.'), 400

    registration = {
        'id': new_id(),
        'studentId': student['id'],
        'session': settings.get('currentSession', '2025/2026'),
        'semester': settings.get('currentSemester', 'First Semester'),
        'level': student.get('level'),
        'courseIds': course_ids,
        'totalCredits': total,
        'status': 'SUBMITTED',
        'createdAt': now()
    }

    try:
        put_record('registrations', registration, commit=False)
        audit(
            'COURSE_REGISTRATION_SUBMITTED',
            'REGISTRATION',
            {
                'registrationId': registration['id'],
                'studentId': student['id'],
                'session': registration['session'],
                'semester': registration['semester'],
                'courseIds': course_ids,
                'totalCredits': total
            },
            actor,
            required=True
        )
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Course registration/audit transaction failed.')
        return jsonify(
            success=False,
            message='Could not submit course registration. Please try again.'
        ), 500

    return jsonify(success=True, registration=registration), 201
@portal_bp.patch('/registrations/<rid>/approve')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','HOD')
def approve_registration(rid):
    registration = get_record('registrations', rid)
    if not registration:
        return jsonify(success=False, message='Registration not found.'), 404

    actor = current_user() or {}
    registration.update(
        status='APPROVED_BY_HOD',
        approvedAt=now(),
        approvedBy=actor.get('id')
    )

    try:
        put_record('registrations', registration, commit=False)
        audit(
            'COURSE_REGISTRATION_APPROVED',
            'REGISTRATION',
            {
                'registrationId': rid,
                'studentId': registration.get('studentId'),
                'session': registration.get('session'),
                'semester': registration.get('semester'),
                'approvedBy': actor.get('id')
            },
            actor,
            required=True
        )
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Registration approval/audit transaction failed.')
        return jsonify(
            success=False,
            message='Could not approve course registration. Please try again.'
        ), 500

    return jsonify(success=True, registration=registration)
@portal_bp.get('/results')
@role_required(
    'SUPER_ADMIN',
    'INSTITUTION_ADMIN',
    'REGISTRAR',
    'EXAM_OFFICER',
    'RECTOR',
    'LECTURER',
    'HOD'
)
def results():
    actor = current_user() or {}
    category = str(actor.get('category', '')).upper()
    role = str(actor.get('role', '')).upper()

    rows = filtered('results')

    # Super Admin and designated institution-wide academic officers
    # may view results across the institution.
    institution_wide = (
        role == 'SUPER_ADMIN'
        or category in {
            'INSTITUTION_ADMIN',
            'REGISTRAR',
            'EXAM_OFFICER',
            'RECTOR'
        }
    )

    if institution_wide:
        return response_list('results', rows)

    # HODs may view results only for courses in their department.
    if category == 'HOD':
        department_id = actor.get('departmentId')

        if not department_id:
            return jsonify(
                success=False,
                message='Your account has no assigned department.'
            ), 403

        department_courses = {
            str(course.get('id'))
            for course in all_records('courses')
            if str(course.get('departmentId')) == str(department_id)
        }

        scoped = [
            result for result in rows
            if str(result.get('courseId')) in department_courses
        ]

        return response_list('results', scoped)

    # Lecturers may view results only for their active course
    # assignments in the current session and semester.
    if category == 'LECTURER':
        settings = get_record('settings', 'default') or {}
        session = str(settings.get('currentSession', '2025/2026'))
        semester = str(settings.get('currentSemester', 'First Semester'))

        assignments = [
            item for item in all_records('courseAssignments')
            if str(item.get('lecturerId')) == str(actor.get('id'))
            and str(item.get('session')) == session
            and str(item.get('semester')) == semester
            and str(item.get('status', '')).upper() == 'ACTIVE'
        ]

        course_ids = {
            str(item.get('courseId'))
            for item in assignments
        }

        registrations = [
            item for item in all_records('registrations')
            if str(item.get('session')) == session
            and str(item.get('semester')) == semester
            and str(item.get('status', '')).upper() == 'APPROVED_BY_HOD'
        ]

        enrolled = {
            (str(registration.get('studentId')), str(course_id))
            for registration in registrations
            for course_id in (registration.get('courseIds') or [])
        }

        scoped = [
            result for result in rows
            if str(result.get('courseId')) in course_ids
            and (
                str(result.get('studentId')),
                str(result.get('courseId'))
            ) in enrolled
            and str(result.get('session', session)) == session
            and str(result.get('semester', semester)) == semester
        ]

        return response_list('results', scoped)

    return jsonify(
        success=False,
        message='Insufficient permissions.'
    ), 403
@portal_bp.get('/results/my-results')
@jwt_required()
def my_results():
 u=current_user();s=next((x for x in all_records('students') if str(x.get('userId'))==str((u or {}).get('id'))),None);rows=[r for r in all_records('results') if s and str(r.get('studentId'))==str(s.get('id')) and r.get('status')=='PUBLISHED'];return response_list('results',rows)
@portal_bp.post('/results/score-entry')
@role_required('SUPER_ADMIN', 'LECTURER')
def score_entry():
    actor = current_user() or {}
    category = str(actor.get('category', '')).upper()
    role = str(actor.get('role', '')).upper()

    d = body()
    student_id = str(d.get('studentId') or '').strip()
    course_id = str(d.get('courseId') or '').strip()

    student = get_record('students', student_id) if student_id else None
    course = get_record('courses', course_id) if course_id else None

    if not student:
        return jsonify(
            success=False,
            message='A valid student record is required.'
        ), 400

    if not course:
        return jsonify(
            success=False,
            message='A valid course record is required.'
        ), 400

    settings = get_record('settings', 'default') or {}
    session = str(settings.get('currentSession', '2025/2026'))
    semester = str(settings.get('currentSemester', 'First Semester'))

    # Lecturers must have an active assignment for this exact
    # course, session and semester.
    if role != 'SUPER_ADMIN':
        if category != 'LECTURER':
            return jsonify(
                success=False,
                message='Only assigned lecturers may enter scores.'
            ), 403

        assignment = next(
            (
                item for item in all_records('courseAssignments')
                if str(item.get('lecturerId')) == str(actor.get('id'))
                and str(item.get('courseId')) == course_id
                and str(item.get('session')) == session
                and str(item.get('semester')) == semester
                and str(item.get('status', '')).upper() == 'ACTIVE'
            ),
            None
        )

        if not assignment:
            return jsonify(
                success=False,
                message='You are not assigned to this course for the current session and semester.'
            ), 403

        # The student must have an approved registration containing
        # this course for the same academic session and semester.
        registration = next(
            (
                item for item in all_records('registrations')
                if str(item.get('studentId')) == student_id
                and str(item.get('session')) == session
                and str(item.get('semester')) == semester
                and str(item.get('status', '')).upper() == 'APPROVED_BY_HOD'
                and course_id in [
                    str(value) for value in (item.get('courseIds') or [])
                ]
            ),
            None
        )

        if not registration:
            return jsonify(
                success=False,
                message='The student has no approved registration for this course in the current session and semester.'
            ), 403

    try:
        ca = float(d.get('caScore', 0))
        exam = float(d.get('examScore', 0))
    except (TypeError, ValueError):
        return jsonify(
            success=False,
            message='Scores must be numeric.'
        ), 400

    if not math.isfinite(ca) or not math.isfinite(exam):
        return jsonify(
            success=False,
            message='Scores must be finite numeric values.'
        ), 400

    ca_max = float(settings.get('caMaxMarks', 40))
    ex_max = float(settings.get('examMaxMarks', 60))

    if ca < 0 or ca > ca_max or exam < 0 or exam > ex_max:
        return jsonify(
            success=False,
            message='Score exceeds configured limits.'
        ), 400

    total = ca + exam
    grade = (
        'A' if total >= 70 else
        'B' if total >= 60 else
        'C' if total >= 50 else
        'D' if total >= 45 else
        'E' if total >= 40 else
        'F'
    )
    gp = {'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0}[grade]

    result = dict(d)
    result.update({
        'id': new_id(),
        'studentId': student_id,
        'courseId': course_id,
        'session': session,
        'semester': semester,
        'caScore': ca,
        'examScore': exam,
        'totalScore': total,
        'grade': grade,
        'gradePoint': gp,
        'status': 'SUBMITTED',
        'submittedBy': actor.get('id')
    })

    try:
        # Re-check for duplicates after acquiring the transaction lock.
        existing_result = next(
            (
                item for item in all_records('results')
                if str(item.get('studentId')) == student_id
                and str(item.get('courseId')) == course_id
                and str(item.get('session') or session) == session
                and str(item.get('semester') or semester) == semester
            ),
            None
        )

        if existing_result:
            db.session.rollback()
            return jsonify(
                success=False,
                message='A result already exists for this student, course, session and semester.'
            ), 409

        # Use a stable internal key so the database unique constraint
        # prevents concurrent duplicate submissions on MySQL and SQLite.
        identity = json.dumps(
            [student_id, course_id, session, semester],
            ensure_ascii=False,
            separators=(',', ':')
        )
        result_record_key = 'result:' + hashlib.sha256(
            identity.encode('utf-8')
        ).hexdigest()

        put_record(
            'results',
            result,
            commit=False,
            record_key=result_record_key
        )
        audit(
            'RESULT_SCORE_SUBMITTED',
            'RESULT',
            {
                'id': result['id'],
                'resultId': result['id'],
                'studentId': student_id,
                'courseId': course_id,
                'session': session,
                'semester': semester,
                'submittedBy': actor.get('id'),
                'status': result.get('status')
            },
            actor,
            required=True
        )
        db.session.commit()
    except IntegrityError:
        db.session.rollback()

        # A concurrent request may have inserted the same academic result.
        duplicate = next(
            (
                item for item in all_records('results')
                if str(item.get('studentId')) == student_id
                and str(item.get('courseId')) == course_id
                and str(item.get('session') or session) == session
                and str(item.get('semester') or semester) == semester
            ),
            None
        )

        if duplicate:
            return jsonify(
                success=False,
                message='A result already exists for this student, course, session and semester.'
            ), 409

        current_app.logger.exception(
            "Integrity error during result submission and audit transaction."
        )
        return jsonify(
            success=False,
            message='Could not save the result. Please try again.'
        ), 500

    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Result submission and audit transaction failed."
        )
        return jsonify(
            success=False,
            message='Could not save the result. Please try again.'
        ), 500

    return jsonify(success=True, result=result), 201
@portal_bp.patch('/results/<rid>/publish')
@role_required(
    'SUPER_ADMIN',
    'INSTITUTION_ADMIN',
    'REGISTRAR',
    'EXAM_OFFICER',
    'HOD'
)
def publish_result(rid):
    actor = current_user() or {}
    category = str(actor.get('category', '')).upper()
    role = str(actor.get('role', '')).upper()

    result = get_record('results', rid)
    if not result:
        return jsonify(success=False, message='Result not found.'), 404

    # HODs may publish only results for courses in their department.
    if role != 'SUPER_ADMIN' and category == 'HOD':
        department_id = actor.get('departmentId')
        course = get_record('courses', result.get('courseId'))

        if not department_id:
            return jsonify(
                success=False,
                message='Your account has no assigned department.'
            ), 403

        if not course or str(course.get('departmentId')) != str(department_id):
            return jsonify(
                success=False,
                message='You may only publish results for your department.'
            ), 403

    if str(result.get('status', '')).upper() == 'PUBLISHED':
        return jsonify(
            success=False,
            message='This result has already been published and cannot be published again.'
        ), 409

    result.update(
        status='PUBLISHED',
        publishedAt=now(),
        approvedBy=actor.get('id')
    )

    try:
        put_record('results', result, commit=False)
        audit(
            'RESULT_PUBLISHED',
            'RESULT',
            {
                'id': rid,
                'resultId': rid,
                'studentId': result.get('studentId'),
                'courseId': result.get('courseId'),
                'session': result.get('session'),
                'semester': result.get('semester'),
                'approvedBy': actor.get('id'),
                'approverRole': role,
                'approverCategory': category,
                'status': result.get('status')
            },
            actor,
            required=True
        )
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Result publication and audit transaction failed."
        )
        return jsonify(
            success=False,
            message='Could not publish the result. Please try again.'
        ), 500

    return jsonify(success=True, result=result)

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
    data = body()
    invoice = get_record('invoices', data.get('invoiceId'))
    if not invoice:
        return jsonify(success=False, message='Invoice not found.'), 404

    actor = current_user()
    student = next(
        (item for item in all_records('students')
         if str(item.get('userId')) == str((actor or {}).get('id'))),
        None
    )

    if (
        (actor or {}).get('role') not in ('SUPER_ADMIN', 'ADMIN', 'BURSAR')
        and (not student or str(invoice.get('studentId')) != str(student.get('id')))
    ):
        return jsonify(success=False, message='Forbidden.'), 403

    try:
        due = max(0, float(invoice.get('amount', 0)) - float(invoice.get('amountPaid', 0)))
    except (TypeError, ValueError):
        return jsonify(success=False, message='Invoice amount is invalid.'), 400

    if due <= 0:
        return jsonify(success=False, message='Invoice is already paid.'), 400

    payment = {
        'id': new_id(),
        'reference': 'EDO-' + secrets.token_hex(6).upper(),
        'invoiceId': invoice['id'],
        'studentId': invoice.get('studentId'),
        'amount': due,
        'channel': data.get('channel', 'Bank Transfer'),
        'status': 'PENDING',
        'providerReference': '',
        'paidAt': now()
    }

    try:
        put_record('payments', payment, commit=False)
        audit(
            'PAYMENT_INITIATED',
            'PAYMENT',
            {
                'paymentId': payment['id'],
                'reference': payment['reference'],
                'invoiceId': payment['invoiceId'],
                'studentId': payment.get('studentId'),
                'amount': payment['amount'],
                'channel': payment['channel'],
                'status': payment['status']
            },
            actor,
            required=True
        )
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Payment initiation/audit transaction failed.')
        return jsonify(
            success=False,
            message='Could not initiate payment. Please try again.'
        ), 500

    return jsonify(success=True, transaction=payment, invoice=invoice), 201
@portal_bp.get('/finance/payments')
@role_required('SUPER_ADMIN','ADMIN','BURSAR','REGISTRAR')
def payments():return response_list('payments',filtered('payments'))
@portal_bp.get('/attendance')
@role_required('SUPER_ADMIN','ADMIN','LECTURER','HOD','REGISTRAR')
def attendance():
    actor = current_user() or {}
    rows = filtered('attendance')

    if str(actor.get('category', '')).upper() == 'LECTURER':
        settings = get_record('settings', 'default') or {}
        session = str(settings.get('currentSession', '2025/2026')).strip()
        semester = str(settings.get('currentSemester', 'First Semester')).strip()

        assigned_course_ids = {
            str(item.get('courseId'))
            for item in all_records('courseAssignments')
            if str(item.get('lecturerId')) == str(actor.get('id'))
            and str(item.get('session', session)) == session
            and str(item.get('semester', semester)) == semester
            and str(item.get('status', 'ACTIVE')).upper() == 'ACTIVE'
        }

        rows = [
            item for item in rows
            if str(item.get('courseId')) in assigned_course_ids
            and str(item.get('session', session)) == session
            and str(item.get('semester', semester)) == semester
        ]

    return response_list('attendance', rows)
@portal_bp.post('/attendance')
@role_required('SUPER_ADMIN','ADMIN','LECTURER')
def record_attendance():
    data = body()
    data['id'] = new_id()
    data.setdefault('date', now()[:10])
    data.setdefault('records', [])

    if not isinstance(data.get('records'), list):
        return jsonify(success=False, message='Attendance records must be a list.'), 400

    actor = current_user() or {}

    if str(actor.get('category', '')).upper() == 'LECTURER':
        settings = get_record('settings', 'default') or {}
        # Lecturers must use the server-configured current academic period.
        # Never trust session or semester supplied in the request body.
        session = str(settings.get('currentSession') or '2025/2026').strip()
        semester = str(settings.get('currentSemester') or 'First Semester').strip()
        course_id = str(data.get('courseId') or '').strip()

        if not course_id:
            return jsonify(success=False, message='A course is required.'), 400

        data['session'] = session
        data['semester'] = semester

        assigned = any(
            str(item.get('lecturerId')) == str(actor.get('id'))
            and str(item.get('courseId')) == course_id
            and str(item.get('session', session)) == session
            and str(item.get('semester', semester)) == semester
            and str(item.get('status', 'ACTIVE')).upper() == 'ACTIVE'
            for item in all_records('courseAssignments')
        )
        if not assigned:
            return jsonify(success=False, message='You are not assigned to this course.'), 403

        eligible_student_ids = set()
        for registration in all_records('registrations'):
            course_ids = registration.get('courseIds') or []
            if (
                str(registration.get('session')) == session
                and str(registration.get('semester')) == semester
                and str(registration.get('status', '')).upper() == 'APPROVED_BY_HOD'
                and course_id in {str(value) for value in course_ids}
            ):
                eligible_student_ids.add(str(registration.get('studentId')))

        submitted_ids = {
            str(record.get('studentId'))
            for record in data.get('records', [])
            if isinstance(record, dict) and record.get('studentId') is not None
        }

        if len(submitted_ids) != len(data.get('records', [])):
            return jsonify(success=False, message='Every attendance record must contain a studentId.'), 400

        if not submitted_ids.issubset(eligible_student_ids):
            return jsonify(
                success=False,
                message='Attendance can only be recorded for students approved for this course.'
            ), 403

    try:
        saved_session = put_record('attendance', data, commit=False)
        audit(
            'ATTENDANCE_RECORDED',
            'ATTENDANCE',
            {
                'attendanceId': saved_session['id'],
                'date': saved_session.get('date'),
                'courseId': saved_session.get('courseId'),
                'session': saved_session.get('session'),
                'semester': saved_session.get('semester'),
                'recordCount': len(saved_session.get('records') or [])
            },
            actor,
            required=True
        )
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Attendance recording/audit transaction failed.')
        return jsonify(
            success=False,
            message='Could not record attendance. Please try again.'
        ), 500

    return jsonify(success=True, session=saved_session), 201
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
@role_required(
    'SUPER_ADMIN',
    'INSTITUTION_ADMIN',
    'REGISTRAR',
    'EXAM_OFFICER',
    'RECTOR'
)
def audit_logs():
    logs = filtered('auditLogs')

    try:
        limit = max(1, min(int(request.args.get('limit', 40)), 500))
        offset = max(0, int(request.args.get('offset', 0)))
    except (TypeError, ValueError):
        limit = 40
        offset = 0

    logs = sorted(
        logs,
        key=lambda item: item.get('timestamp', ''),
        reverse=True
    )

    return response_list('logs', logs[offset:offset + limit])
@portal_bp.get('/dashboard/stats')
@role_required('SUPER_ADMIN','ADMIN','REGISTRAR','BURSAR','HOD')
def dashboard_stats():
    users = all_records('users')
    apps = all_records('applications')
    students = all_records('students')
    inv = all_records('invoices')
    payments = all_records('payments')

    actor = current_user() or {}
    actor_role = str(actor.get('role', '')).upper()
    actor_category = str(actor.get('category', '')).upper()

    audit_categories = {
        'INSTITUTION_ADMIN',
        'REGISTRAR',
        'EXAM_OFFICER',
        'RECTOR'
    }

    can_view_audit = (
        actor_role == 'SUPER_ADMIN'
        or actor_category in audit_categories
    )

    recent_audit_logs = []
    if can_view_audit:
        recent_audit_logs = sorted(
            all_records('auditLogs'),
            key=lambda item: item.get('timestamp', ''),
            reverse=True
        )[:8]

    return jsonify(
        success=True,
        stats={
            'totalUsers': len(users),
            'totalStudents': len(students),
            'totalApplicants': len(apps),
            'pendingApplications': sum(
                a.get('status') in ('SUBMITTED', 'UNDER_REVIEW')
                for a in apps
            ),
            'totalCourses': len(all_records('courses')),
            'totalRevenue': sum(
                float(x.get('amount', 0))
                for x in payments
                if x.get('status') == 'VERIFIED'
            ),
            'outstandingFees': sum(
                max(
                    0,
                    float(x.get('amount', 0))
                    - float(x.get('amountPaid', 0))
                )
                for x in inv
            ),
            'recentAuditLogs': recent_audit_logs
        }
    )

# CMS - NEWS
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
 return jsonify(success=True,article=a)
@portal_bp.post('/cms/news')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def news_create():
 d=body()
 if not d.get('title') or not d.get('content'):return jsonify(success=False,message='Title and content are required.'),400
 d.update(id=new_id(),slug=d.get('slug') or '-'.join(str(d['title']).lower().split()),author=(current_user() or {}).get('fullName'),views=0,publishedAt=d.get('publishedAt') or now());d.setdefault('status','DRAFT');d.setdefault('isFeaturedInSlider',False)
 article = put_record('newsArticles',d)
 audit('NEWS_CREATED', 'NEWS', {'id': article['id'], 'title': article.get('title')}, current_user())
 return jsonify(success=True,article=article),201
@portal_bp.put('/cms/news/<rid>')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def news_update(rid):
 a=get_record('newsArticles',rid)
 if not a:return jsonify(success=False,message='Article not found.'),404
 a.update(body());a['id']=rid
 article = put_record('newsArticles',a)
 audit('NEWS_UPDATED', 'NEWS', {'id': article['id'], 'title': article.get('title')}, current_user())
 return jsonify(success=True,article=article)
@portal_bp.delete('/cms/news/<rid>')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def news_delete(rid):
 if not remove_record('newsArticles',rid):return jsonify(success=False,message='Article not found.'),404
 audit('NEWS_DELETED', 'NEWS', {'id': rid}, current_user())
 return jsonify(success=True,message='Article deleted.')
@portal_bp.patch('/cms/news/<rid>/toggle-slider')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def news_toggle(rid):
 a=get_record('newsArticles',rid)
 if not a:return jsonify(success=False,message='Article not found.'),404
 a['isFeaturedInSlider']=not bool(a.get('isFeaturedInSlider'));put_record('newsArticles',a);return jsonify(success=True,isFeaturedInSlider=a['isFeaturedInSlider'])

# CMS - SLIDES
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
 d=body();d['id']=new_id();d.setdefault('isActive',True);d.setdefault('order',len(all_records('sliderSlides')))
 slide = put_record('sliderSlides',d)
 audit('SLIDE_CREATED', 'SLIDE', {'id': slide['id'], 'title': slide.get('title')}, current_user())
 return jsonify(success=True,slide=slide),201
@portal_bp.put('/cms/slides/<rid>')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def slides_update(rid):
 s=get_record('sliderSlides',rid)
 if not s:return jsonify(success=False,message='Slide not found.'),404
 s.update(body());s['id']=rid
 slide = put_record('sliderSlides',s)
 audit('SLIDE_UPDATED', 'SLIDE', {'id': slide['id'], 'title': slide.get('title')}, current_user())
 return jsonify(success=True,slide=slide)
@portal_bp.delete('/cms/slides/<rid>')
@role_required('SUPER_ADMIN','ADMIN','CONTENT_EDITOR','ICT_ADMIN')
def slides_delete(rid):
 if not remove_record('sliderSlides',rid):return jsonify(success=False,message='Slide not found.'),404
 audit('SLIDE_DELETED', 'SLIDE', {'id': rid}, current_user())
 return jsonify(success=True,message='Slide deleted.')

# CMS - LEADERSHIP / FAQS / CALENDAR
CMS_CONTENT_COLLECTIONS = {
    'leadership': 'leadershipProfiles',
    'faqs': 'portalFaqs',
    'calendar': 'academicCalendar',
}

CMS_EDITOR_CATEGORIES = {
    'INSTITUTION_ADMIN',
    'RECTOR',
    'REGISTRAR',
    'CONTENT_EDITOR',
}

def cms_content_can_manage():
    actor = None
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request(optional=True)
        actor = current_user() if get_jwt_identity() else None
    except Exception:
        actor = None

    if not actor:
        return False

    if not actor.get('isActive', True) or actor.get('isLocked', False):
        return False

    role = str(actor.get('role', '')).upper()
    category = str(actor.get('category', '')).upper()

    return role == 'SUPER_ADMIN' or category in CMS_EDITOR_CATEGORIES


def cms_content_list_records(kind):
    collection = CMS_CONTENT_COLLECTIONS[kind]
    rows = all_records(collection)

    if not cms_content_can_manage():
        rows = [
            row for row in rows
            if str(row.get('status', '')).upper() == 'PUBLISHED'
        ]
    elif request.args.get('status'):
        requested_status = request.args['status'].upper()
        rows = [
            row for row in rows
            if str(row.get('status', '')).upper() == requested_status
        ]

    if kind == 'faqs':
        rows.sort(key=lambda row: row.get('order', 0))

    elif kind == 'calendar':
        rows.sort(
            key=lambda row: str(
                row.get('date') or row.get('startDate') or ''
            )
        )

    return rows


def cms_content_audit(action, kind, record_id, actor):
    audit(
        action,
        'CMS_' + kind.upper(),
        {'recordId': record_id},
        actor
    )


def cms_content_create_record(kind, data, actor):
    required_fields = {
        'leadership': ('fullName', 'title'),
        'faqs': ('question', 'answer'),
        'calendar': ('title',),
    }

    if not isinstance(data, dict) or not data:
        return None, 'A valid content object is required.'

    missing = [
        field for field in required_fields[kind]
        if not str(data.get(field, '')).strip()
    ]

    if missing:
        return None, 'Required fields: ' + ', '.join(missing)

    record = dict(data)
    record['id'] = new_id()
    record.setdefault('status', 'DRAFT')
    record.setdefault('createdAt', now())
    record['updatedAt'] = now()

    try:
        saved = put_record(
            CMS_CONTENT_COLLECTIONS[kind],
            record,
            commit=True
        )
        cms_content_audit('CMS_CONTENT_CREATED', kind, saved['id'], actor)
        return saved, None
    except Exception:
        db.session.rollback()
        current_app.logger.exception('CMS content creation failed')
        raise


def cms_content_update_record(kind, record_id, data, actor):
    if not isinstance(data, dict) or not data:
        return None, 'A valid content object is required.'

    collection = CMS_CONTENT_COLLECTIONS[kind]
    record = get_record(collection, record_id)

    if not record:
        return None, 'Content record not found.'

    updated = dict(record)
    updated.update(data)
    updated['id'] = record_id
    updated['updatedAt'] = now()

    try:
        saved = put_record(collection, updated, commit=True)
        cms_content_audit('CMS_CONTENT_UPDATED', kind, record_id, actor)
        return saved, None
    except Exception:
        db.session.rollback()
        current_app.logger.exception('CMS content update failed')
        raise


def cms_content_delete_record(kind, record_id, actor):
    collection = CMS_CONTENT_COLLECTIONS[kind]
    record = PortalRecord.query.filter_by(
        collection=collection,
        record_key=str(record_id)
    ).first()

    if not record:
        return False

    try:
        db.session.delete(record)
        db.session.commit()
        cms_content_audit('CMS_CONTENT_DELETED', kind, record_id, actor)
        return True
    except Exception:
        db.session.rollback()
        current_app.logger.exception('CMS content deletion failed')
        raise


def cms_content_list_response(kind):
    rows = cms_content_list_records(kind)
    return jsonify(success=True, **{kind: rows})


def cms_content_create_response(kind):
    actor = current_user() or {}
    saved, error = cms_content_create_record(kind, body(), actor)

    if error:
        return jsonify(success=False, message=error), 400

    return jsonify(success=True, **{'record': saved}), 201


def cms_content_update_response(kind, record_id):
    actor = current_user() or {}
    saved, error = cms_content_update_record(
        kind,
        record_id,
        body(),
        actor
    )

    if error:
        status = 404 if error == 'Content record not found.' else 400
        return jsonify(success=False, message=error), status

    return jsonify(success=True, **{'record': saved})


def cms_content_delete_response(kind, record_id):
    actor = current_user() or {}

    if not cms_content_delete_record(kind, record_id, actor):
        return jsonify(success=False, message='Content record not found.'), 404

    return jsonify(success=True, message='Content record deleted.')


# Leadership
@portal_bp.get('/cms/leadership')
def cms_leadership_list():
    return cms_content_list_response('leadership')

@portal_bp.post('/cms/leadership')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_leadership_create():
    return cms_content_create_response('leadership')

@portal_bp.put('/cms/leadership/<rid>')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_leadership_update(rid):
    return cms_content_update_response('leadership', rid)

@portal_bp.delete('/cms/leadership/<rid>')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_leadership_delete(rid):
    return cms_content_delete_response('leadership', rid)

# FAQs
@portal_bp.get('/cms/faqs')
def cms_faqs_list():
    return cms_content_list_response('faqs')

@portal_bp.post('/cms/faqs')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_faqs_create():
    return cms_content_create_response('faqs')

@portal_bp.put('/cms/faqs/<rid>')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_faqs_update(rid):
    return cms_content_update_response('faqs', rid)

@portal_bp.delete('/cms/faqs/<rid>')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_faqs_delete(rid):
    return cms_content_delete_response('faqs', rid)

# Calendar
@portal_bp.get('/cms/calendar')
def cms_calendar_list():
    return cms_content_list_response('calendar')

@portal_bp.post('/cms/calendar')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_calendar_create():
    return cms_content_create_response('calendar')

@portal_bp.put('/cms/calendar/<rid>')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_calendar_update(rid):
    return cms_content_update_response('calendar', rid)

@portal_bp.delete('/cms/calendar/<rid>')
@role_required('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RECTOR', 'REGISTRAR', 'CONTENT_EDITOR')
def cms_calendar_delete(rid):
    return cms_content_delete_response('calendar', rid)


@portal_bp.errorhandler(404)
def not_found(_): return jsonify(success=False,message='API endpoint or record not found.'),404
