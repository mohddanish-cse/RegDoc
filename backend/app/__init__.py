import os
from flask import Flask
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS

load_dotenv()
bcrypt = Bcrypt()
db = None

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config["JWT_TOKEN_LOCATION"] = ["headers", "query_string"]
    jwt = JWTManager(app)
    
    global db
    try:
        client = MongoClient(os.getenv("MONGO_URI"), server_api=ServerApi('1'))
        client.admin.command('ping')
        print("✅ You successfully connected to MongoDB!")
        db = client.RegDocDB
    except Exception as e:
        print(e)
        
    bcrypt.init_app(app)
        
    # Handles /api/auth/* routes
    from .auth import auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix='/api/auth')

    # Handles /api/user/* routes
    from .user import user_blueprint
    app.register_blueprint(user_blueprint, url_prefix='/api/user')

    # Handles document creation (/upload) and read routes
    from .document_routes import document_blueprint
    from .document_read_routes import document_read_blueprint
    app.register_blueprint(document_blueprint, url_prefix='/api/documents')
    app.register_blueprint(document_read_blueprint, url_prefix='/api/documents')
    
    # Handles document state changes (/submit, /review, etc.)
    from .document_workflow_routes import document_workflow_blueprint
    app.register_blueprint(document_workflow_blueprint, url_prefix='/api/documents')

    return app