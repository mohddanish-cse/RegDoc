from flask import Blueprint, jsonify, request
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from bson.errors import InvalidId
from .decorators import admin_required

user_blueprint = Blueprint('user', __name__)

ALLOWED_ROLES = ["Contributor", "QC", "Reviewer", "Approver", "Admin"]

@user_blueprint.route("/profile", methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    users_collection = db.users
    user = users_collection.find_one({'_id': ObjectId(user_id)})
    
    if user:
        return jsonify({
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email'],
            "role": user['role'],
            "created_at": user['created_at'].isoformat()
        }), 200
    else:
        return jsonify({"error": "User not found"}), 404

@user_blueprint.route("/reviewers", methods=['GET'])
@jwt_required()
def get_potential_reviewers():
    users_collection = db.users
    try:
        reviewers = list(users_collection.find(
            {'role': {'$in': ['Reviewer']}}, # Admins/Approvers can also review
            {'_id': 1, 'username': 1}
        ))
        for reviewer in reviewers:
            reviewer['id'] = str(reviewer['_id'])
            del reviewer['_id']
        return jsonify(reviewers), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
        print(f"Error in get_all_users_admin: {e}")
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
        print(f"Error in update_user_role: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500