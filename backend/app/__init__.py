from flask import Flask,send_from_directory
from flask_cors import CORS

from app.extensions import db

import os

from app.routes.doc_routes import doc_bp
from app.routes.auth_routes import auth_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///regdoc.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')


    db.init_app(app)

    with app.app_context():
        from app.models.document import Document
        db.create_all()


    app.register_blueprint(auth_bp)
    app.register_blueprint(doc_bp)


    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    return app
