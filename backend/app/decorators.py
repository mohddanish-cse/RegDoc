# backend/app/decorators.py

from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import get_jwt

# Your existing admin_required decorator remains.
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
            # We need to get the full user object to check the role.
            # This assumes a @jwt_required decorator has already run.
            # For our custom setup, we should ensure the user is loaded.
            # Let's adapt this for your @token_required if we re-introduce it,
            # but for now, we'll build it to be compatible with @jwt_required
            # by fetching the user here.
            
            # This is a placeholder for a more robust user-loading decorator.
            # For now, this logic will live here.
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