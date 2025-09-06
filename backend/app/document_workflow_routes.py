from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
import datetime
from bson.objectid import ObjectId
from bson.errors import InvalidId
from .crypto_utils import sign_data

document_workflow_blueprint = Blueprint('document_workflow', __name__)

fs = None
def init_gridfs():
    global fs
    if fs is None:
        fs = gridfs.GridFS(db)

# --- OLD ---
# @document_workflow_blueprint.route("/upload", methods=['POST'])
# @jwt_required()
# def upload_document():
#     init_gridfs() # Ensure GridFS is initialized

#     if 'file' not in request.files:
#         return jsonify({"error": "No file part in the request"}), 400
    
#     file = request.files['file']

#     if file.filename == '':
#         return jsonify({"error": "No file selected"}), 400

#     if file:
#         user_id = get_jwt_identity()
        
#         # Save the file to GridFS with metadata
#         file_id = fs.put(
#             file, 
#             filename=file.filename, 
#             contentType=file.content_type,
#             author_id=ObjectId(user_id),
#             status='Draft',
#             version='0.1',
#             history=[] # To build the audit trail later
#         )
        
#         return jsonify({
#             "message": "File uploaded successfully",
#             "file_id": str(file_id)
#         }), 201

#     return jsonify({"error": "An unexpected error occurred"}), 500

@document_workflow_blueprint.route("/upload", methods=['POST'])
@jwt_required()
def upload_document():
    init_gridfs()
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file:
        user_id = get_jwt_identity()
        
        # --- NEW: Generate Sequential Document Number ---
        # Find the last document to determine the next number
        last_doc = db.fs.files.find_one(
            {"document_number": {"$regex": "^REG-"}},
            sort=[("document_number", -1)]
        )
        
        if last_doc and last_doc.get('document_number'):
            last_num = int(last_doc['document_number'].split('-')[1])
            new_num = last_num + 1
        else:
            new_num = 1 # This is the first document
        
        # Format the number with leading zeros (e.g., REG-00001)
        doc_number = f"REG-{new_num:05d}"

        file_id = fs.put(
            file, 
            filename=file.filename, 
            contentType=file.content_type,
            author_id=ObjectId(user_id),
            status='Draft',
            version='0.1',
            history=[],
            document_number=doc_number # <-- Add the new field
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
  

@document_workflow_blueprint.route("/<file_id>/sign", methods=['POST'])
@jwt_required()
def sign_and_approve_document(file_id):
    init_gridfs()
    
    data = request.get_json()
    comments = data.get('comments', '')

    try:
        file_id_obj = ObjectId(file_id)
        user_id_obj = ObjectId(get_jwt_identity())

        # --- Get User and Document ---
        file_metadata = db.fs.files.find_one({'_id': file_id_obj})
        approver = db.users.find_one({'_id': user_id_obj})

        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        if not approver:
            return jsonify({"error": "Approver not found"}), 404
        
        # --- Authorization & State Checks ---
        if approver.get('role') != 'Admin':
             return jsonify({"error": "Forbidden: You are not an approver"}), 403
        if file_metadata['status'] != 'Review Complete':
            return jsonify({"error": f"Document is not ready for final approval."}), 400

        # --- Digital Signature Logic ---
        # 1. Read the document content from GridFS
        file_content = fs.get(file_id_obj).read()
        
        # 2. Get the approver's private key
        private_key = approver.get('private_key')
        if not private_key:
            return jsonify({"error": "Approver does not have a private key."}), 500
            
        # 3. Sign the document content
        signature = sign_data(private_key, file_content)

        # --- Create Audit Log and Update Document ---
        history_entry = {
            "action": "Published",
            "user_id": user_id_obj,
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": comments
        }
        
        db.fs.files.update_one(
            {'_id': file_id_obj},
            {
                '$set': {
                    'status': 'Published', 
                    'version': '1.0',
                    'signature': signature, 
                    'signed_by': user_id_obj,
                    'signed_at': datetime.datetime.now(datetime.timezone.utc)
                },
                '$push': {'history': history_entry}
            }
        )

        return jsonify({"message": "Document has been successfully signed and published"}), 200

    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500