# backend/app/document_routes.py

import datetime
import uuid
from flask import Blueprint, request, jsonify
from . import db  # Use the __init__.py db instance
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
from bson.objectid import ObjectId

# --- Blueprint Setup ---
document_blueprint = Blueprint('documents', __name__)

# GridFS is initialized from the db object
fs = gridfs.GridFS(db)

# --- Helper Function for Atomic Document Number ---
# This robust function prevents race conditions when generating document IDs.
def get_next_sequence(name):
    ret = db.counters.find_one_and_update(
        {'_id': name},
        {'$inc': {'seq': 1}},
        return_document=True,
        upsert=True  # Creates the counter if it doesn't exist
    )
    return ret['seq']


@document_blueprint.route("/upload", methods=['POST'])
@jwt_required()
def upload_document():
    # Standard file checks
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # We get the user's ID string from the JWT, as in your original code.
        user_id_str = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(user_id_str)})
        if not user:
            return jsonify({"error": "Authenticated user not found in database"}), 404

        # 1. Receive TMF-specific metadata from the frontend form
        tmf_metadata_fields = [
            "study_id", "country", "site_id",
            "tmf_zone", "tmf_section", "tmf_artifact"
        ]
        tmf_metadata = {field: request.form.get(field, '') for field in tmf_metadata_fields}

        # 2. Save the file to GridFS to get its unique ID
        file_id = fs.put(file, filename=file.filename, contentType=file.content_type)

        # 3. Generate the robust, sequential document number
        doc_seq = get_next_sequence('document_id')
        doc_number = f"REG-{doc_seq:05d}"

        # 4. Create the first revision object
        first_revision = {
            "revision_number": 0,
            "file_id": file_id, # Storing as ObjectId
            "filename": file.filename,
            "author_comment": request.form.get('comment', 'Initial version.'),
            "uploaded_at": datetime.datetime.now(datetime.timezone.utc)
        }

        # 5. Build the complete document object for the new 'documents' collection
        document_metadata = {
            "doc_number": doc_number,
            "major_version": 1,
            "minor_version": 0,
            "lineage_id": str(uuid.uuid4()),
            "status": "Draft",
            "author_id": ObjectId(user_id_str),
            "author_username": user.get('username'),
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "tmf_metadata": tmf_metadata,
            "workflow": [],
            "revisions": [first_revision],
            "active_revision": 0,
            "history": [{
                "action": "Created",
                "user_id": ObjectId(user_id_str),
                "user_username": user.get('username'),
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "details": f"Document created with filename: {file.filename}"
            }]
        }

        # 6. Insert the new document metadata into our dedicated 'documents' collection
        db.documents.insert_one(document_metadata)

        return jsonify({
            "message": "Document uploaded successfully",
            "doc_number": doc_number
        }), 201

    except Exception as e:
        print(f"Error during upload: {e}") # For debugging
        return jsonify({"error": "An internal error occurred during upload"}), 500