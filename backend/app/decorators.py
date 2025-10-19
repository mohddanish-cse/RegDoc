# backend/app/decorators.py

from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import get_jwt

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") == "Admin":
                return fn(*args, **kwargs)
            else:
                return jsonify(msg="Admins only!"), 403
        return decorator
    return wrapper

# --- NEW: Generic decorator to check for specific roles ---
# This is a more modular and reusable approach.
def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from . import db
            from bson.objectid import ObjectId
            from flask_jwt_extended import get_jwt_identity
            
            user_id = get_jwt_identity()
            user = db.users.find_one({'_id': ObjectId(user_id)})
            
            if not user:
                return jsonify(error="User not found"), 404

            user_role = user.get('role')
            
            # An Admin can do anything.
            if user_role == 'Admin':
                return f(*args, **kwargs)
            
            # Check if the user has the specific required role.
            if user_role != required_role:
                return jsonify(error=f"Forbidden: '{required_role}' role required."), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator