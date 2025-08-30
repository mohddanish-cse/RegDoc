import datetime
from flask import Blueprint, request, jsonify
from . import db, bcrypt
from flask_jwt_extended import create_access_token

auth_blueprint = Blueprint('auth', __name__)

@auth_blueprint.route("/register", methods=['POST'])
def register_user():
    users_collection = db.users
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('username'):
        return jsonify({"error": "Missing required fields"}), 400
    email = data.get('email')
    if users_collection.find_one({'email': email}):
        return jsonify({"error": "User with this email already exists"}), 409
    hashed_password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')
    new_user = {
        'email': email,
        'username': data.get('username'),
        'password': hashed_password,
        'role': 'Contributor',
        'created_at': datetime.datetime.now(datetime.timezone.utc)
    }
    result = users_collection.insert_one(new_user)
    return jsonify({
        "message": "User registered successfully!",
        "user_id": str(result.inserted_id)
    }), 201

@auth_blueprint.route("/login", methods=['POST'])
def login_user():
    users_collection = db.users
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400
    email = data.get('email')
    password = data.get('password')
    user = users_collection.find_one({'email': email})
    if user and bcrypt.check_password_hash(user['password'], password):
        identity = str(user['_id'])
        additional_claims = {"role": user['role']}
        access_token = create_access_token(identity=identity, additional_claims=additional_claims)
        return jsonify(access_token=access_token), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401