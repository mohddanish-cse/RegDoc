# backend/app/user.py

from flask import Blueprint, jsonify, request
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from bson.errors import InvalidId
from .decorators import admin_required

user_blueprint = Blueprint('user', __name__)

ALLOWED_ROLES = ["Contributor", "QC", "Reviewer", "Approver", "Admin"]

# --- get_profile route (unchanged) ---
@user_blueprint.route("/profile", methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if user:
        return jsonify({
            "id": str(user['_id']), "username": user['username'],
            "email": user['email'], "role": user['role'],
            "created_at": user['created_at'].isoformat()
        }), 200
    else:
        return jsonify({"error": "User not found"}), 404


@user_blueprint.route("/users-by-role/<role_name>", methods=['GET'])
@jwt_required()
def get_users_by_role(role_name):
    """Fetches users who have a specific role."""
    if role_name not in ALLOWED_ROLES:
        return jsonify({"error": "Invalid role specified"}), 400
    
    try:
        users_collection = db.users
        users = list(users_collection.find(
            {'role': role_name},
            {'_id': 1, 'username': 1}  # Projection to get only ID and username
        ))
        for user in users:
            user['id'] = str(user['_id'])
            del user['_id']
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- get_all_users_admin route (unchanged) ---
@user_blueprint.route("/all", methods=['GET'])
@jwt_required()
@admin_required()
def get_all_users_admin():
    users_collection = db.users
    try:
        projection = {'password': 0, 'private_key': 0, 'public_key': 0}
        all_users = list(users_collection.find({}, projection))
        for user in all_users:
            user['id'] = str(user['_id'])
            del user['_id']
            user['created_at'] = user['created_at'].isoformat()
        return jsonify(all_users), 200
    except Exception as e:
        return jsonify({"error": "An internal server error occurred"}), 500

@user_blueprint.route("/<user_id>/role", methods=['PUT'])
@jwt_required()
@admin_required()
def update_user_role(user_id):
    users_collection = db.users
    data = request.get_json()
    new_role = data.get('role')

    if not new_role or new_role not in ALLOWED_ROLES:
        return jsonify({"error": "Invalid role specified"}), 400

    try:
        user_id_obj = ObjectId(user_id)
        user_to_update = users_collection.find_one({'_id': user_id_obj})
        if not user_to_update:
            return jsonify({"error": "User not found"}), 404

        users_collection.update_one(
            {'_id': user_id_obj},
            {'$set': {'role': new_role}}
        )
        return jsonify({"message": f"User's role successfully updated to {new_role}"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid user ID format"}), 400
    except Exception as e:
        return jsonify({"error": "An internal server error occurred"}), 500