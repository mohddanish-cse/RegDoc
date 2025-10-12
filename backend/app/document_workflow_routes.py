# backend/app/document_workflow_routes.py

import datetime
from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from bson.errors import InvalidId

# --- Blueprint for document workflow actions ---
document_workflow_blueprint = Blueprint('document_workflow', __name__)

def get_user_details(user_ids):
    """Helper function to fetch usernames for a list of user IDs."""
    user_object_ids = [ObjectId(uid) for uid in user_ids]
    users = list(db.users.find({'_id': {'$in': user_object_ids}}, {'_id': 1, 'username': 1}))
    return {str(u['_id']): u['username'] for u in users}

@document_workflow_blueprint.route("/<doc_id>/submit", methods=['POST'])
@jwt_required()
def submit_document_for_review(doc_id):
    try:
        user_id = get_jwt_identity()
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        # --- Validation ---
        if not document:
            return jsonify(error="Document not found"), 404
        if str(document['author_id']) != user_id:
            return jsonify(error="Forbidden: You are not the author"), 403
        if document['status'] != 'Draft':
            return jsonify(error="Document must be in 'Draft' status"), 400

        data = request.get_json()
        qc_user_ids = data.get('qc_users', [])
        reviewer_ids = data.get('reviewers', [])
        approver_id = data.get('approver')

        if not qc_user_ids or not reviewer_ids or not approver_id:
            return jsonify(error="QC, Reviewer, and Approver assignments are required"), 400

        # --- Programmatically Build the TMF Workflow Template ---
        all_user_ids = qc_user_ids + reviewer_ids + [approver_id]
        user_details_map = get_user_details(all_user_ids)

        qc_stage = {
            "stage_number": 0, "stage_name": "Quality Control (QC)", "review_type": "parallel",
            "status": "In Progress",
            "reviewers": [{"user_id": ObjectId(uid), "username": user_details_map.get(uid), "status": "Pending"} for uid in qc_user_ids]
        }
        review_stage = {
            "stage_number": 1, "stage_name": "Peer Review", "review_type": "parallel",
            "status": "Pending",
            "reviewers": [{"user_id": ObjectId(uid), "username": user_details_map.get(uid), "status": "Pending"} for uid in reviewer_ids]
        }
        approval_stage = {
            "stage_number": 2, "stage_name": "Final Approval", "review_type": "parallel",
            "status": "Pending",
            "reviewers": [{"user_id": ObjectId(approver_id), "username": user_details_map.get(approver_id), "status": "Pending"}]
        }
        
        final_workflow = [qc_stage, review_stage, approval_stage]

        # --- Update the Document in DB ---
        history_entry = {
            "action": "Submitted", "user_id": ObjectId(user_id),
            "user_username": db.users.find_one({'_id': ObjectId(user_id)}).get('username'),
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": "Submitted document for TMF Simple Workflow."
        }

        db.documents.update_one(
            {'_id': doc_id_obj},
            {
                '$set': {
                    'status': 'In QC', 'current_stage': 0, 'workflow': final_workflow
                },
                '$push': {'history': history_entry}
            }
        )
        return jsonify(message="Document submitted for Quality Control"), 200

    except InvalidId:
        return jsonify(error="Invalid document ID format"), 400
    except Exception as e:
        print(f"Error in submit_document_for_review: {e}")
        return jsonify(error="An internal server error occurred"), 500