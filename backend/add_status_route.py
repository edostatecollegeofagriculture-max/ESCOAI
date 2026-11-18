from pathlib import Path

portal_path = Path("app/routes/portal.py")
content = portal_path.read_text(encoding="utf-8")

if "@portal_bp.route('/results/<id>/status', methods=['PUT'])" in content:
    print("[SKIP] Route already exists")
    exit(0)

new_route = """

@portal_bp.route('/results/<id>/status', methods=['PUT'])
@jwt_required()
def update_result_status(id):
    data = request.get_json() or {}
    new_status = str(data.get('status', '')).upper()
    if new_status not in ['PENDING', 'PUBLISHED', 'REJECTED']:
        return jsonify(success=False, message="Invalid status"), 400
    
    result = get_record('results', id)
    if not result:
        return jsonify(success=False, message="Result not found"), 404
    
    result['status'] = new_status
    result['updatedAt'] = now()
    put_record('results', result, record_key=id)
    return jsonify(success=True, result=result)
"""

content = content.rstrip() + "\n" + new_route
portal_path.write_text(content, encoding="utf-8")
print("[PASS] Added PUT /results/<id>/status route")
