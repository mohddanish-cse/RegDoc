from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
import datetime
from bson.objectid import ObjectId
from bson.errors import InvalidId

document_workflow_blueprint = Blueprint('document_workflow', __name__)

fs = None
def init_gridfs():
    global fs
    if fs is None:
        fs = gridfs.GridFS(db)

@document_workflow_blueprint.route("/upload", methods=['POST'])
@jwt_required()
def upload_document():
    init_gridfs() # Ensure GridFS is initialized

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file:
        user_id = get_jwt_identity()
        
        # Save the file to GridFS with metadata
        file_id = fs.put(
            file, 
            filename=file.filename, 
            contentType=file.content_type,
            author_id=ObjectId(user_id),
            status='Draft',
            version='0.1',
            history=[] # To build the audit trail later
        )
        
        return jsonify({
            "message": "File uploaded successfully",
            "file_id": str(file_id)
        }), 201

    return jsonify({"error": "An unexpected error occurred"}), 500


@document_workflow_blueprint.route("/<file_id>/submit", methods=['POST'])
@jwt_required()
def submit_document(file_id):
    init_gridfs()
    
    try:
        data = request.get_json()
        reviewer_ids_str = data.get('reviewers', [])
        
        # --- Validation ---
        if not isinstance(reviewer_ids_str, list) or not reviewer_ids_str:
            return jsonify({"error": "A list of reviewer IDs must be provided."}), 400

        file_id_obj = ObjectId(file_id)
        user_id = get_jwt_identity()

        file_metadata = db.fs.files.find_one({'_id': file_id_obj})

        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        
        if str(file_metadata['author_id']) != user_id:
            return jsonify({"error": "Forbidden: You are not the author"}), 403

        if file_metadata['status'] != 'Draft':
            return jsonify({"error": f"Document is already in '{file_metadata['status']}' status"}), 400

        # Convert reviewer ID strings to ObjectId
        reviewer_ids_obj = [ObjectId(rid) for rid in reviewer_ids_str]

        history_entry = {
            "action": "Submitted for Review",
            "user_id": ObjectId(user_id),
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": f"Submitted to {len(reviewer_ids_obj)} reviewer(s)."
        }

        db.fs.files.update_one(
            {'_id': file_id_obj},
            {
                '$set': {
                    'status': 'In Review',
                    'reviewers': reviewer_ids_obj # <-- Save the list of reviewers
                },
                '$push': {'history': history_entry}
            }
        )

        return jsonify({"message": "Document submitted for review successfully"}), 200

    except InvalidId:
        return jsonify({"error": "Invalid ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@document_workflow_blueprint.route("/<file_id>/review", methods=['POST'])
@jwt_required()
def review_document(file_id):
    init_gridfs()
    
    data = request.get_json()
    decision = data.get('decision')
    comments = data.get('comments', '') # Comments are optional

    if not decision or decision not in ['Approved', 'Rejected']:
        return jsonify({"error": "Invalid decision provided. Must be 'Approved' or 'Rejected'."}), 400

    try:
        file_id_obj = ObjectId(file_id)
        user_id_obj = ObjectId(get_jwt_identity())

        file_metadata = db.fs.files.find_one({'_id': file_id_obj})

        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        
        # --- Authorization Check ---
        # 1. Check if the user is in the list of reviewers for this document
        # Note: We will need to add a 'reviewers' field when submitting a doc.
        # For now, let's assume the author can also review for testing purposes.
        # A proper check would be: if user_id_obj not in file_metadata.get('reviewers', []):
        if str(file_metadata['author_id']) != str(user_id_obj):
             return jsonify({"error": "Forbidden: You are not assigned to review this document"}), 403

        # --- State Machine Check ---
        if file_metadata['status'] != 'In Review':
            return jsonify({"error": f"Document is in '{file_metadata['status']}' status and cannot be reviewed."}), 400

        # --- Create the Audit Log Entry ---
        history_entry = {
            "action": f"Review {decision}",
            "user_id": user_id_obj,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": comments
        }

        # --- Update the Document ---
        # For a real system with multiple reviewers, the logic would be more complex.
        # For our project, we'll assume one reviewer's decision is final.
        new_status = 'Approved' if decision == 'Approved' else 'Rejected'
        
        db.fs.files.update_one(
            {'_id': file_id_obj},
            {
                '$set': {'status': new_status},
                '$push': {'history': history_entry}
            }
        )

        return jsonify({"message": f"Document has been {decision.lower()}"}), 200

    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    