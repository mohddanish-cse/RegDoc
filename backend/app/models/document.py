from app.extensions import db
from datetime import datetime

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default='draft')
    assigned_to = db.Column(db.String(100), nullable=True)
    uploaded_by = db.Column(db.String(100), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
