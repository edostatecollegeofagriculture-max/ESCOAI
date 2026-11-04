from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

def role_required(*allowed_roles):
    """
    Decorator for verifying that the requesting user's JWT role matches
    at least one of the allowed roles. SUPER_ADMIN is granted universal pass.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role', '')

            if user_role == 'SUPER_ADMIN':
                return fn(*args, **kwargs)

            if user_role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': f"Forbidden. Role '{user_role}' does not have sufficient permissions."
                }), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper
