from flask import Blueprint, request, jsonify
from config.users import USERS

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = USERS.get(username)

    if not user or user["password"] != password:
        return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({
        "message": "Login successful",
        "username": username,
        "role": user["role"]
    })

@auth_bp.route('/reviewers', methods=['GET'])
def get_reviewers():
    reviewer_list = [
        {"username": uname}
        for uname, info in USERS.items()
        if info["role"] == "reviewer"
    ]
    return jsonify(reviewer_list)
