from pathlib import Path
import re

# Smart path detection: works from root OR backend folder
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
    print("[FAIL] Could not find portal.py in either location.")
    print(f"Current dir: {Path.cwd()}")
    exit(1)

print(f"[OK] Found portal.py at: {portal_path}")

content = portal_path.read_text(encoding="utf-8")
original_len = len(content)
print(f"Original file: {original_len} chars")

# Remove ALL create_course and delete_course blocks
block_pattern = re.compile(
    r"(@\w+\.route\('/academics/courses(?:/<id>)?',\s*methods=\['(?:POST|DELETE)'\]\)\s*\n"
    r"@jwt_required\(\)\s*\n"
    r"def (?:create_course|delete_course)\(.*?\n"
    r"(?:.*\n)*?"
    r"(?=\n@\w+\.route|\ndef |\Z))",
    re.MULTILINE
)

removed_count = 0
while True:
    match = block_pattern.search(content)
    if not match:
        break
    content = content[:match.start()] + content[match.end():]
    removed_count += 1

print(f"Removed {removed_count} duplicate course route block(s).")

remaining_create = content.count("def create_course")
remaining_delete = content.count("def delete_course")
print(f"Remaining 'create_course' definitions: {remaining_create}")
print(f"Remaining 'delete_course' definitions: {remaining_delete}")

clean_routes = '''

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
'''

content += clean_routes
portal_path.write_text(content, encoding="utf-8")
print(f"[PASS] Rewrote portal.py ({len(content)} chars). Clean routes appended.")
