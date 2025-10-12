# backend/app/document_routes.py

import datetime
import uuid
from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
from bson.objectid import ObjectId

# --- Blueprint for document creation and basic data ---
document_blueprint = Blueprint('documents', __name__)

fs = gridfs.GridFS(db)

def get_next_sequence(name):
    ret = db.counters.find_one_and_update(
        {'_id': name}, {'$inc': {'seq': 1}},
        return_document=True, upsert=True
    )
    return ret['seq']

@document_blueprint.route("/upload", methods=['POST'])
@jwt_required()
def upload_document():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        user_id_str = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(user_id_str)})
        if not user:
            return jsonify({"error": "Authenticated user not found"}), 404

        tmf_metadata = {
            "study_id": request.form.get("study_id", ''),
            "country": request.form.get("country", ''),
            "site_id": request.form.get("site_id", ''),
            "tmf_zone": request.form.get("tmf_zone", ''),
            "tmf_section": request.form.get("tmf_section", ''),
            "tmf_artifact": request.form.get("tmf_artifact", '')
        }

        file_id = fs.put(file, filename=file.filename, contentType=file.content_type)
        doc_seq = get_next_sequence('document_id')
        doc_number = f"REG-TMF-{doc_seq:05d}"

        first_revision = {
            "revision_number": 0, "file_id": file_id, "filename": file.filename,
            "author_comment": request.form.get('comment', 'Initial version.'),
            "uploaded_at": datetime.datetime.now(datetime.timezone.utc)
        }

        document_metadata = {
            "doc_number": doc_number, "major_version": 1, "minor_version": 0,
            "lineage_id": str(uuid.uuid4()), "status": "Draft",
            "author_id": ObjectId(user_id_str), "author_username": user.get('username'),
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "tmf_metadata": tmf_metadata, "workflow": [], "revisions": [first_revision],
            "active_revision": 0,
            "history": [{
                "action": "Created", "user_id": ObjectId(user_id_str),
                "user_username": user.get('username'),
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "details": f"Document created: {file.filename}"
            }]
        }

        db.documents.insert_one(document_metadata)
        return jsonify({"message": "Document uploaded", "doc_number": doc_number}), 201

    except Exception as e:
        print(f"Error in upload_document: {e}")
        return jsonify({"error": "An internal error occurred"}), 500