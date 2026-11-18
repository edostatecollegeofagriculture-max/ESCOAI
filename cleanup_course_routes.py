from pathlib import Path
import re

portal_path = Path("app/routes/portal.py")
content = portal_path.read_text(encoding="utf-8")

print(f"Original file length: {len(content)} chars")

# Remove every create_course and delete_course block, regardless of decorator name
patterns = [
    r"@portal_bp\.route\('/academics/courses', methods=\['POST'\]\).*?(?=\n@portal_bp\.route|\n@app\.route|\ndef |\Z)",
    r"@bp\.route\('/academics/courses', methods=\['POST'\]\).*?(?=\n@portal_bp\.route|\n@app\.route|\ndef |\Z)",
    r"@portal_bp\.route\('/academics/courses/<id>', methods=\['DELETE'\]\).*?(?=\n@portal_bp\.route|\n@app\.route|\ndef |\Z)",
    r"@bp\.route\('/academics/courses/<id>', methods=\['DELETE'\]\).*?(?=\n@portal_bp\.route|\n@app\.route|\ndef |\Z)",
]

for pattern in patterns:
    content = re.sub(pattern, "", content, flags=re.DOTALL)

print(f"After cleanup: {len(content)} chars")
print(f"Contains 'def create_course': {'def create_course' in content}")
print(f"Contains 'def delete_course': {'def delete_course' in content}")

correct_routes = """

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

content += correct_routes
portal_path.write_text(content, encoding="utf-8")
print("[PASS] Cleaned up and re-added course routes.")
