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
    comments = data.get('comments', '')

    if not decision or decision not in ['Accepted', 'Rejected']:
        return jsonify({"error": "Invalid decision provided. Must be 'Approved' or 'Rejected'."}), 400

    try:
        file_id_obj = ObjectId(file_id)
        user_id_obj = ObjectId(get_jwt_identity())

        file_metadata = db.fs.files.find_one({'_id': file_id_obj})

        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        
        assigned_reviewers = file_metadata.get('reviewers', [])
        if user_id_obj not in assigned_reviewers:
             return jsonify({"error": "Forbidden: You are not an assigned reviewer for this document."}), 403

        if file_metadata['status'] != 'In Review':
            return jsonify({"error": f"Document is in '{file_metadata['status']}' status and cannot be reviewed."}), 400

        # --- Check if this user has already reviewed ---
        history = file_metadata.get('history', [])
        already_reviewed = any(
            entry['action'] in ['Review Accepted', 'Review Rejected'] and entry['user_id'] == user_id_obj 
            for entry in history
        )
        if already_reviewed:
            return jsonify({"error": "You have already reviewed this document."}), 400

        # --- Create the Audit Log Entry ---
        history_entry = {
            "action": f"Review {decision}",
            "user_id": user_id_obj,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": comments
        }
        
        # --- NEW: Dynamic Status and Version Logic ---
        new_status = file_metadata['status']
        new_version = file_metadata.get('version', '0.1')
        
        # Get a list of users who have already reviewed
        reviewing_users = {entry['user_id'] for entry in history if entry['action'].startswith('Review')}
        
        # Add the current user to the set of reviewers who have acted
        reviewing_users.add(user_id_obj)

        if decision == 'Rejected':
            new_status = 'Rejected'
            # Version might increment to 0.1.1 or similar in a more complex system, but for now, it stays.
        elif len(reviewing_users) == len(assigned_reviewers):
            # This is the last reviewer, and they approved
            new_status = 'Review Complete'
            new_version = '0.2'
        
        db.fs.files.update_one(
            {'_id': file_id_obj},
            {
                '$set': {'status': new_status, 'version': new_version},
                '$push': {'history': history_entry}
            }
        )

        return jsonify({"message": f"Document review submitted as '{decision}'"}), 200

    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@document_workflow_blueprint.route("/<file_id>/approve", methods=['POST'])
@jwt_required()
def final_approve_document(file_id):
    init_gridfs()
    
    data = request.get_json()
    decision = data.get('decision')
    comments = data.get('comments', '')

    if not decision or decision not in ['Approved', 'Rejected']:
        return jsonify({"error": "Invalid decision. Must be 'Approved' or 'Rejected'."}), 400

    try:
        file_id_obj = ObjectId(file_id)
        user_id_obj = ObjectId(get_jwt_identity())

        file_metadata = db.fs.files.find_one({'_id': file_id_obj})

        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        
        # --- Authorization Check ---
        # For now, we'll assume an 'Admin' is the approver.
        # A full implementation would have a separate 'approvers' field.
        user_profile = db.users.find_one({'_id': user_id_obj})
        if not user_profile or user_profile.get('role') != 'Admin':
             return jsonify({"error": "Forbidden: You are not an approver"}), 403

        # --- State Machine Check ---
        if file_metadata['status'] != 'Review Complete':
            return jsonify({"error": f"Document is in '{file_metadata['status']}' status and is not ready for final approval."}), 400

        # --- Create the Audit Log Entry ---
        history_entry = {
            "action": f"Final Approval: {decision}",
            "user_id": user_id_obj,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": comments
        }
        
        # db.fs.files.update_one(
        #     {'_id': file_id_obj},
        #     {
        #         '$set': {'status': decision},
        #         '$push': {'history': history_entry}
        #     }
        # )

        new_version = '1.0' if decision == 'Approved' else file_metadata.get('version')
        db.fs.files.update_one(
            {'_id': file_id_obj},
            {
                '$set': {'status': decision, 'version': new_version},
                '$push': {'history': history_entry}
            }
        )

        return jsonify({"message": f"Document has been {decision.lower()}"}), 200

    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500    