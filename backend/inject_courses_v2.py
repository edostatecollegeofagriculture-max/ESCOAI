from pathlib import Path

# Try both possible locations
candidates = [
    Path("backend/app/routes/portal.py"),  # from root
    Path("app/routes/portal.py"),           # from backend
]

portal_path = None
for c in candidates:
    if c.exists():
        portal_path = c
        break

if not portal_path:
    print(f"[FAIL] Could not find portal.py. Current dir: {Path.cwd()}")
    exit(1)

print(f"[OK] Found portal.py at: {portal_path}")

content = portal_path.read_text(encoding="utf-8")

if "def create_course():" in content:
    print("[SKIP] create_course already exists in portal.py")
    exit()

anchor = "@portal_bp.get('/academics/courses')"
if anchor not in content:
    print("[FAIL] Could not find the GET courses anchor.")
    exit()

new_routes = """

@portal_bp.route('/academics/courses', methods=['POST'])
@jwt_required()
def create_course():
    data = request.get_json() or {}
    code = data.get('code')
    title = data.get('title')
    units = data.get('units', 3)
    department_id = data.get('departmentId')
    level = data.get('level', 'ND I')
    semester = data.get('semester', 'First')
    lecturer_id = data.get('lecturerId')

    if not code or not title:
        return jsonify(success=False, message="Course code and title are required"), 400

    import uuid
    course_id = str(uuid.uuid4())

    lecturer_name = None
    if lecturer_id:
        lec = get_record('leadership', lecturer_id)
        if lec:
            lecturer_name = lec.get('fullName')

    payload = {
        'id': course_id,
        'code': code,
        'title': title,
        'units': units,
        'departmentId': department_id,
        'level': level,
        'semester': semester,
        'lecturerId': lecturer_id,
        'lecturerName': lecturer_name,
        'createdAt': now()
    }

    save_record('courses', course_id, payload)
    return jsonify(success=True, course=payload)

@portal_bp.route('/academics/courses/<id>', methods=['DELETE'])
@jwt_required()
def delete_course(id):
    try:
        delete_record('courses', id)
        return jsonify(success=True, message="Course deleted")
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500
"""

content = content.replace(anchor, new_routes + "\n" + anchor)
portal_path.write_text(content, encoding="utf-8")
print("[PASS] Safely injected POST and DELETE course routes.")
