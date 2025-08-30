from flask import Blueprint, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from .decorators import admin_required

# This blueprint is for user-related operations
user_blueprint = Blueprint('user', __name__)

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
            "created_at": user['created_at']
        }), 200
    else:
        return jsonify({"error": "User not found"}), 404

@user_blueprint.route("/admin/users", methods=['GET'])
@jwt_required()
@admin_required()
def get_all_users():
    users_collection = db.users
    all_users = list(users_collection.find({}, {'password': 0}))
    for user in all_users:
        user['_id'] = str(user['_id'])
    return jsonify(all_users), 200