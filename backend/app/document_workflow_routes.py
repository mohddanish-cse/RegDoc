# backend/app/document_workflow_routes.py

import datetime
from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from bson.errors import InvalidId
from gridfs import GridFS
from .crypto_utils import sign_data

# --- Blueprint for document workflow actions ---
document_workflow_blueprint = Blueprint('document_workflow', __name__)
fs = GridFS(db)

def get_user_details(user_ids):
    """Helper function to fetch usernames for a list of user IDs."""
    user_object_ids = [ObjectId(uid) for uid in user_ids]
    users = list(db.users.find({'_id': {'$in': user_object_ids}}, {'_id': 1, 'username': 1}))
    return {str(u['_id']): u['username'] for u in users}

# In backend/app/document_workflow_routes.py, replace the submit_document_for_review function

@document_workflow_blueprint.route("/<doc_id>/submit", methods=['POST'])
@jwt_required()
def submit_document_for_review(doc_id):
    try:
        user_id_str = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(user_id_str)})
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        if not document: return jsonify(error="Document not found"), 404
        if str(document['author_id']) != user_id_str: return jsonify(error="Forbidden"), 403
        if document['status'] != 'Draft': return jsonify(error="Document must be in 'Draft' status"), 400

        data = request.get_json()
        template_id = data.get('template_id')
        assignments = data.get('assignments') # e.g., {"QC": ["id1"], "Reviewer": ["id2"]}

        if not template_id or not assignments:
            return jsonify(error="A template ID and user assignments are required"), 400

        # --- The "Brain": Build the workflow from the template ---
        template = db.workflow_templates.find_one({'_id': template_id})
        if not template:
            return jsonify(error="Workflow template not found"), 404

        final_workflow = []
        all_user_ids = [uid for user_list in assignments.values() for uid in user_list]
        user_details_map = get_user_details(all_user_ids)

        for stage_template in template['stages']:
            role_to_assign = stage_template['role_required']
            assigned_user_ids = assignments.get(role_to_assign, [])
            
            if not assigned_user_ids:
                return jsonify(error=f"No users assigned for the '{role_to_assign}' stage"), 400

            final_workflow.append({
                "stage_number": stage_template['stage_number'],
                "stage_name": stage_template['stage_name'],
                "review_type": stage_template['review_type'],
                "status": "In Progress" if stage_template['stage_number'] == 0 else "Pending",
                "reviewers": [
                    {"user_id": ObjectId(uid), "username": user_details_map.get(uid), "status": "Pending"}
                    for uid in assigned_user_ids
                ]
            })

        history_entry = { "action": "Submitted", "user_id": ObjectId(user_id_str), "user_username": user.get('username'), "timestamp": datetime.datetime.now(datetime.timezone.utc), "details": f"Submitted with '{template['name']}'." }

        db.documents.update_one(
            {'_id': doc_id_obj},
            {
                '$set': { 'status': 'In QC', 'current_stage': 0, 'workflow': final_workflow },
                '$push': {'history': history_entry}
            }
        )
        return jsonify(message="Document submitted for Quality Control"), 200

    except InvalidId: return jsonify(error="Invalid ID format"), 400
    except Exception as e:
        print(f"Error in submit_document_for_review: {e}")
        return jsonify(error="An internal server error occurred"), 500

        
# --- CORRECTED: The QC Review action route ---
@document_workflow_blueprint.route('/<doc_id>/qc-review', methods=['POST'])
@jwt_required()
def qc_document_review(doc_id):
    try:
        user_id_str = get_jwt_identity()
        user_id_obj = ObjectId(user_id_str)
        user = db.users.find_one({'_id': user_id_obj})
        
        if user.get('role') not in ['QC', 'Admin']:
             return jsonify(error="Forbidden: You do not have QC permissions."), 403

        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        if not document: return jsonify(error="Document not found"), 404
        if document['status'] != 'In QC': return jsonify(error="Document is not in QC status"), 400

        data = request.get_json()
        decision = data.get('decision')
        comment = data.get('comment', '')

        if decision not in ['Pass', 'Fail']: return jsonify(error="Decision must be 'Pass' or 'Fail'"), 400
        if decision == 'Fail' and not comment: return jsonify(error="A comment is required when failing a QC check"), 400

        new_status, next_stage, history_action = ('In Review', 1, "QC Passed") if decision == 'Pass' else ('Changes Requested', 0, "QC Failed")

        history_entry = {
            "action": history_action, "user_id": user_id_obj,
            "user_username": user.get('username'),
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": comment
        }
        
        # --- THE FIX: A single, atomic update command ---
        # This one command updates the top-level status, the stage, the history,
        # AND the specific reviewer's status inside the nested array.
        result = db.documents.update_one(
            {'_id': doc_id_obj},
            {
                '$set': {
                    'status': new_status,
                    'current_stage': next_stage,
                    # This targets the specific reviewer in the specific stage
                    'workflow.$[stage].reviewers.$[reviewer].status': 'Completed'
                },
                '$push': {'history': history_entry}
            },
            # This tells MongoDB which elements to target with the $[stage] and $[reviewer] placeholders
            array_filters=[
                {'stage.stage_number': 0}, # Target the QC stage
                {'reviewer.user_id': user_id_obj} # Target the current user
            ]
        )

        if result.modified_count == 0:
            # This can happen if the user tries to act twice, or isn't in the list.
            return jsonify(error="Could not update document. You may not be an active reviewer for this stage."), 400

        return jsonify(message=f"QC review submitted as '{decision}'"), 200

    except InvalidId:
        return jsonify(error="Invalid document ID format"), 400
    except Exception as e:
        print(f"Error in qc_document_review: {e}")
        return jsonify(error="An internal server error occurred"), 500
    

# Append this to the end of backend/app/document_workflow_routes.py

@document_workflow_blueprint.route('/<doc_id>/peer-review', methods=['POST'])
@jwt_required()
def peer_document_review(doc_id):
    try:
        user_id_str = get_jwt_identity()
        user_id_obj = ObjectId(user_id_str)
        user = db.users.find_one({'_id': user_id_obj})
        
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        # --- Validation & Authorization ---
        if not document: return jsonify(error="Document not found"), 404
        if document['status'] != 'In Review': return jsonify(error="Document is not in the Peer Review stage"), 400
        if document['current_stage'] != 1: return jsonify(error="This is not the active stage"), 400

        data = request.get_json()
        decision = data.get('decision') # Expected: 'Approved', 'ChangesRequested', 'Rejected'
        comment = data.get('comment', '')

        if decision not in ['Approved', 'ChangesRequested', 'Rejected']:
            return jsonify(error="Decision must be 'Approved', 'ChangesRequested', or 'Rejected'"), 400
        if decision != 'Approved' and not comment:
            return jsonify(error="A comment is required for this decision"), 400
            
        # --- Update the specific reviewer's status ---
        update_reviewer_status = db.documents.update_one(
            {'_id': doc_id_obj, 'workflow.stage_number': 1},
            {'$set': {'workflow.$[stage].reviewers.$[reviewer].status': decision}},
            array_filters=[
                {'stage.stage_number': 1},
                {'reviewer.user_id': user_id_obj}
            ]
        )
        if update_reviewer_status.modified_count == 0:
             return jsonify(error="You might not be an active reviewer for this stage or have already acted."), 400

        # --- Check the overall stage status and update the document ---
        updated_doc = db.documents.find_one({'_id': doc_id_obj})
        review_stage = updated_doc['workflow'][1]
        all_reviewers_in_stage = review_stage['reviewers']
        
        history_entry = { "action": f"Peer Review: {decision}", "user_id": user_id_obj, "user_username": user.get('username'), "timestamp": datetime.datetime.now(datetime.timezone.utc), "details": comment }
        
        if decision == 'Rejected':
            db.documents.update_one({'_id': doc_id_obj}, {'$set': {'status': 'Rejected'}, '$push': {'history': history_entry}})
        elif decision == 'ChangesRequested':
            db.documents.update_one({'_id': doc_id_obj}, {'$set': {'status': 'Changes Requested'}, '$push': {'history': history_entry}})
        else: # Decision is 'Approved'
            is_stage_complete = all(r['status'] == 'Approved' for r in all_reviewers_in_stage)
            if is_stage_complete:
                db.documents.update_one({'_id': doc_id_obj}, {'$set': {'status': 'Review Complete', 'current_stage': 2}, '$push': {'history': history_entry}})
            else:
                db.documents.update_one({'_id': doc_id_obj}, {'$push': {'history': history_entry}})

        return jsonify(message=f"Review submitted as '{decision}'"), 200

    except InvalidId:
        return jsonify(error="Invalid document ID format"), 400
    except Exception as e:
        print(f"Error in peer_document_review: {e}")
        return jsonify(error="An internal server error occurred"), 500

# Append this to the end of backend/app/document_workflow_routes.py

@document_workflow_blueprint.route('/<doc_id>/final-approval', methods=['POST'])
@jwt_required()
def final_approval_review(doc_id):
    try:
        user_id_str = get_jwt_identity()
        user_id_obj = ObjectId(user_id_str)
        user = db.users.find_one({'_id': user_id_obj})
        
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        # --- Validation & Authorization (Unchanged) ---
        if not document: return jsonify(error="Document not found"), 404
        if document['status'] != 'Review Complete': return jsonify(error="Document is not ready for final approval"), 400
        if document['current_stage'] != 2: return jsonify(error="This is not the active approval stage"), 400
        if user.get('role') not in ['Approver', 'Admin']:
             return jsonify(error="Forbidden: You do not have approval permissions."), 403

        data = request.get_json()
        decision = data.get('decision')
        comment = data.get('comment', '')

        if decision not in ['Approved', 'Rejected']: return jsonify(error="Decision must be 'Approved' or 'Rejected'"), 400
        if decision == 'Rejected' and not comment: return jsonify(error="A comment is required for this decision"), 400

        # --- Update the approver's status in the workflow (Unchanged) ---
        db.documents.update_one(
            {'_id': doc_id_obj, 'workflow.stage_number': 2},
            {'$set': {'workflow.$[stage].reviewers.$[reviewer].status': decision}},
            array_filters=[ {'stage.stage_number': 2}, {'reviewer.user_id': user_id_obj} ]
        )
        
        history_entry = { "action": f"Final Approval: {decision}", "user_id": user_id_obj, "user_username": user.get('username'), "timestamp": datetime.datetime.now(datetime.timezone.utc), "details": comment }
        
        final_update = {'$push': {'history': history_entry}}
        
        # --- NEW: Digital Signature Logic ---
        if decision == 'Approved':
            # 1. Get the approver's private key
            private_key = user.get('private_key')
            if not private_key:
                return jsonify(error="Approver is missing a private key. Cannot sign document."), 500

            # 2. Get the content of the file to be signed from GridFS
            active_rev = document['revisions'][document['active_revision']]
            file_id_to_sign = active_rev['file_id']
            file_content = fs.get(file_id_to_sign).read()

            # 3. Call your crypto utility to generate the signature
            signature = sign_data(private_key, file_content)
            
            # 4. Prepare the update to save the signature and metadata
            final_update['$set'] = {
                'status': 'Approved',
                'signature': signature,
                'signed_by': user_id_obj,
                'signed_by_username': user.get('username'),
                'signed_at': datetime.datetime.now(datetime.timezone.utc)
            }
        else: # Decision is 'Rejected'
            final_update['$set'] = {'status': 'Rejected'}

        # --- Final atomic update to the document ---
        db.documents.update_one({'_id': doc_id_obj}, final_update)

        return jsonify(message=f"Final decision submitted as '{decision}'"), 200

    except InvalidId:
        return jsonify(error="Invalid document ID format"), 400
    except Exception as e:
        print(f"Error in final_approval_review: {e}")
        return jsonify(error="An internal server error occurred"), 500


# Append this to the end of backend/app/document_workflow_routes.py

@document_workflow_blueprint.route("/<doc_id>/amend", methods=['POST'])
@jwt_required()
def amend_document(doc_id):
    if 'file' not in request.files:
        return jsonify({"error": "A new file must be provided"}), 400
    new_file = request.files['file']
    if new_file.filename == '':
        return jsonify({"error": "No new file selected"}), 400

    try:
        user_id_str = get_jwt_identity()
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        # --- Validation ---
        if not document:
            return jsonify(error="Original document not found"), 404
        if str(document['author_id']) != user_id_str:
            return jsonify(error="Forbidden: You are not the author"), 403
        if document['status'] not in ['Rejected', 'Changes Requested']:
            return jsonify(error="Only documents with status 'Rejected' or 'Changes Requested' can be amended"), 400

        # --- Create New Revision ---
        file_id = fs.put(new_file, filename=new_file.filename, contentType=new_file.content_type)
        new_revision_number = document.get('active_revision', 0) + 1
        
        new_revision = {
            "revision_number": new_revision_number,
            "file_id": file_id,
            "filename": new_file.filename,
            "author_comment": request.form.get('comment', 'Amended version.'),
            "uploaded_at": datetime.datetime.now(datetime.timezone.utc)
        }

        # --- Prepare History and Updates ---
        user = db.users.find_one({'_id': ObjectId(user_id_str)})
        history_entry = {
            "action": "Amended", "user_id": ObjectId(user_id_str),
            "user_username": user.get('username'),
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": f"Submitted new revision {new_revision_number}."
        }
        
        # --- Atomic Database Update ---
        # This one command updates everything at once.
        db.documents.update_one(
            {'_id': doc_id_obj},
            {
                '$set': {
                    'status': 'Draft',      # Reset status to Draft
                    'workflow': [],         # Clear the old workflow
                    'current_stage': None,  # Reset the stage pointer
                    'minor_version': new_revision_number,
                    'active_revision': new_revision_number
                },
                '$push': {
                    'revisions': new_revision,
                    'history': history_entry
                }
            }
        )
        
        # NOTE: We no longer return a new_document_id because we are updating the existing one.
        return jsonify(message="Document successfully amended and reset to Draft state."), 200

    except InvalidId:
        return jsonify(error="Invalid document ID format"), 400
    except Exception as e:
        print(f"Error in amend_document: {e}")
        return jsonify(error="An internal server error occurred"), 500