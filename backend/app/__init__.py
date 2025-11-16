# backend/app/__init__.py

import os
from flask import Flask, app
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .ctms_routes import ctms_bp
from .integration_routes import integration_blueprint
from .email_service import mail

load_dotenv()
bcrypt = Bcrypt()
db = None

def create_app():
    app = Flask(__name__)
    CORS(app, origins=[
        "http://localhost:5173",  # Local Vite dev
        "http://localhost:3000",  # Alternative local
        "https://regdoc.onrender.com",  # Production frontend
        "https://regdoc-backend.onrender.com"  # Backend can call itself
    ])

    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME') 
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD') 
    app.config['FRONTEND_URL'] = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    app.config['DEMO_MODE'] = os.getenv('DEMO_MODE', 'false')
    app.config['DEMO_EMAIL'] = os.getenv('DEMO_EMAIL')
    
    mail.init_app(app)
    
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    jwt = JWTManager(app)
    
    global db
    try:
        client = MongoClient(os.getenv("MONGO_URI"), server_api=ServerApi('1'))
        client.admin.command('ping')
        print("You successfully connected to MongoDB!")
        db = client.RegDocDB
    except Exception as e:
        print(e)
        
    bcrypt.init_app(app)
    
    from .auth import auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix='/api/auth')

    from .user import user_blueprint
    app.register_blueprint(user_blueprint, url_prefix='/api/users')

    from .document_routes import document_blueprint
    app.register_blueprint(document_blueprint, url_prefix='/api/documents')
    
    from .document_read_routes import document_read_blueprint
    app.register_blueprint(document_read_blueprint, url_prefix='/api/documents')
    
    from .document_workflow_routes import document_workflow_blueprint
    app.register_blueprint(document_workflow_blueprint, url_prefix='/api/documents')

    from .document_lifecycle_routes import document_lifecycle_blueprint
    app.register_blueprint(document_lifecycle_blueprint, url_prefix='/api/documents')

    from .ctms_routes import ctms_bp
    app.register_blueprint(ctms_bp, url_prefix='/api')

    from .integration_routes import integration_blueprint
    app.register_blueprint(integration_blueprint, url_prefix='/api/integrations')

    return app