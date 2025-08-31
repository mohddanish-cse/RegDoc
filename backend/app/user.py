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

@user_blueprint.route("/reviewers", methods=['GET'])
@jwt_required()
def get_potential_reviewers():
    users_collection = db.users
    try:
        # Find all users where the role is either 'Reviewer' or 'Admin'
        # The $in operator matches any of the values specified in an array.
        reviewers = list(users_collection.find(
            {'role': {'$in': ['Reviewer', 'Admin']}},
            {'_id': 1, 'username': 1} # Projection: only return ID and username
        ))

        # Convert ObjectId to string for JSON serialization
        for reviewer in reviewers:
            reviewer['id'] = str(reviewer['_id'])
            del reviewer['_id']

        return jsonify(reviewers), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500