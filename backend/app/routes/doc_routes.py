import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models.document import Document

doc_bp = Blueprint('docs', __name__, url_prefix='/api/docs')


# 1. Upload a new document (contributor only)
@doc_bp.route('/', methods=['POST'])
def upload_doc():
    file = request.files.get('file')
    name = request.form.get('name')
    doc_type = request.form.get('type')
    uploader = request.form.get('uploaded_by')

    if not file or not name or not doc_type or not uploader:
        return jsonify({"error": "Missing fields"}), 400

    filename = secure_filename(file.filename)
    upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
    file.save(upload_path)

    doc = Document(
        name=name,
        type=doc_type,
        status='draft',
        assigned_to=None,             # No reviewer assigned yet
        uploaded_by=uploader,
        filename=filename
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({"message": "Document uploaded", "id": doc.id})


# 2. Get documents based on user role
@doc_bp.route('/', methods=['GET'])
def get_docs():
    role = request.args.get('role')
    username = request.args.get('username')

    if role == 'contributor':
        docs = Document.query.filter_by(uploaded_by=username).all()
    elif role == 'reviewer':
        docs = Document.query.filter_by(assigned_to=username, status='in_review').all()
    elif role == 'viewer':
        docs = Document.query.filter_by(status='accepted').all()
    else:
        return jsonify([])

    return jsonify([
        {
            "id": doc.id,
            "name": doc.name,
            "type": doc.type,
            "status": doc.status,
            "assigned_to": doc.assigned_to,
            "uploaded_by": doc.uploaded_by,
            "filename": doc.filename,
            "timestamp": doc.timestamp.isoformat()
        }
        for doc in docs
    ])


# 3. Reviewer updates document status (accepted/rejected)
@doc_bp.route('/<int:doc_id>', methods=['PATCH'])
def update_status(doc_id):
    data = request.get_json()
    new_status = data.get('status')

    doc = Document.query.get(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    if new_status not in ['accepted', 'rejected']:
        return jsonify({"error": "Invalid status"}), 400

    doc.status = new_status
    db.session.commit()

    return jsonify({"message": "Status updated", "id": doc.id})


# 4. Contributor assigns reviewer later from preview view
@doc_bp.route('/<int:doc_id>/assign', methods=['PATCH'])
def assign_reviewer(doc_id):
    data = request.get_json()
    reviewer = data.get('assigned_to')

    doc = Document.query.get(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    doc.assigned_to = reviewer
    doc.status = 'in_review'

    db.session.commit()
    return jsonify({"message": "Reviewer assigned", "id": doc.id})
