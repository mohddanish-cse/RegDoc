import os
from flask import Flask
from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Load environment variables
load_dotenv()

# Initialize extensions
bcrypt = Bcrypt()
db = None

def create_app():
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__)
    CORS(app)
    
    # --- Add JWT Secret Key Configuration ---
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    jwt = JWTManager(app) # Initialize JWTManager
    
    # --- Database Connection ---
    MONGO_URI = os.getenv("MONGO_URI")
    global db
    try:
        client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
        client.admin.command('ping')
        print("✅ You successfully connected to MongoDB!")
        db = client.RegDocDB
    except Exception as e:
        print(e)
        
    # --- Initialize Extensions ---
    bcrypt.init_app(app)
    
    from .auth import auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix='/api/auth')

    from .user import user_blueprint
    app.register_blueprint(user_blueprint, url_prefix='/api/user')
        
    from .document_routes import document_blueprint
    app.register_blueprint(document_blueprint, url_prefix='/api/documents')

    return app