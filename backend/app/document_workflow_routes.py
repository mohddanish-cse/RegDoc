# backend/app/document_workflow_routes.py

import datetime
from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from bson.errors import InvalidId
from gridfs import GridFS
from .crypto_utils import sign_data, verify_signature

document_workflow_blueprint = Blueprint('document_workflow', __name__)
fs = GridFS(db)

def get_user_details(user_ids):
    """Helper function to fetch usernames for a list of user IDs."""
    user_object_ids = [ObjectId(uid) for uid in user_ids]
    users = list(db.users.find({'_id': {'$in': user_object_ids}}, {'_id': 1, 'username': 1}))
    return {str(u['_id']): u['username'] for u in users}

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
    
# --- NEW: The Peer Review action route ---
@document_workflow_blueprint.route('/<doc_id>/peer-review', methods=['POST'])
@jwt_required()
def peer_document_review(doc_id):
    try:
        user_id_str, user_id_obj = get_jwt_identity(), ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id_obj})
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        if not document: return jsonify(error="Document not found"), 404
        if document['status'] != 'In Review': return jsonify(error="Document is not in the Peer Review stage"), 400
        if document['current_stage'] != 1: return jsonify(error="This is not the active stage"), 400

        data = request.get_json()
        decision = data.get('decision')
        comment = data.get('comment', '')

        if decision not in ['Approved', 'ChangesRequested', 'Rejected']:
            return jsonify(error="Decision must be 'Approved', 'ChangesRequested', or 'Rejected'"), 400
        if decision != 'Approved' and not comment:
            return jsonify(error="A comment is required for this decision"), 400
            
        update_reviewer_status = db.documents.update_one(
            {'_id': doc_id_obj, 'workflow.stage_number': 1, 'workflow.reviewers.user_id': user_id_obj},
            {'$set': {'workflow.$[stage].reviewers.$[reviewer].status': decision}},
            array_filters=[{'stage.stage_number': 1}, {'reviewer.user_id': user_id_obj}]
        )
        if update_reviewer_status.modified_count == 0:
             return jsonify(error="You might not be an active reviewer for this stage or have already acted."), 400

        updated_doc = db.documents.find_one({'_id': doc_id_obj})
        review_stage = next((s for s in updated_doc['workflow'] if s['stage_number'] == 1), None)
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
    except Exception as e:
        print(f"Error in peer_document_review: {e}")
        return jsonify(error="An internal server error occurred"), 500

# --- NEW: The Final Approval action route ---
@document_workflow_blueprint.route('/<doc_id>/final-approval', methods=['POST'])
@jwt_required()
def final_approval_review(doc_id):
    try:
        user_id_str, user_id_obj = get_jwt_identity(), ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id_obj})
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        if not document: return jsonify(error="Document not found"), 404
        if document['status'] != 'Review Complete': return jsonify(error="Document is not ready for final approval"), 400
        if document['current_stage'] != 2: return jsonify(error="This is not the active approval stage"), 400
        if user.get('role') not in ['Approver', 'Admin']: return jsonify(error="Forbidden: You do not have approval permissions."), 403

        data = request.get_json()
        decision = data.get('decision')
        comment = data.get('comment', '')

        if decision not in ['Approved', 'Rejected']: return jsonify(error="Decision must be 'Approved' or 'Rejected'"), 400
        if decision == 'Rejected' and not comment: return jsonify(error="A comment is required for this decision"), 400

        history_entry = { "action": f"Final Approval: {decision}", "user_id": user_id_obj, "user_username": user.get('username'), "timestamp": datetime.datetime.now(datetime.timezone.utc), "details": comment }
        final_update = {'$push': {'history': history_entry}}
        
        if decision == 'Approved':
            private_key = user.get('private_key')
            if not private_key: return jsonify(error="Approver is missing a private key."), 500

            active_rev = document['revisions'][document['active_revision']]
            file_content = fs.get(active_rev['file_id']).read()
            signature = sign_data(private_key, file_content)
            
            # The "Veeva Vault" version promotion logic
            new_major_version = document.get('major_version', 0) + 1
            
            final_update['$set'] = {
                'status': 'Approved', 'major_version': new_major_version, 'minor_version': 0,
                'signature': signature, 'signed_by': user_id_obj,
                'signed_by_username': user.get('username'),
                'signed_at': datetime.datetime.now(datetime.timezone.utc)
            }
        else:
            final_update['$set'] = {'status': 'Rejected'}

        db.documents.update_one({'_id': doc_id_obj}, final_update)
        return jsonify(message=f"Final decision submitted as '{decision}'"), 200
    except Exception as e:
        print(f"Error in final_approval_review: {e}")
        return jsonify(error="An internal server error occurred"), 500

# --- NEW: The "Smart" Amend action route ---
@document_workflow_blueprint.route("/<doc_id>/amend", methods=['POST'])
@jwt_required()
def amend_document(doc_id):
    if 'file' not in request.files: return jsonify({"error": "A new file must be provided"}), 400
    new_file = request.files['file']
    if new_file.filename == '': return jsonify({"error": "No new file selected"}), 400

    try:
        user_id_str = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(user_id_str)})
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        if not document: return jsonify(error="Document not found"), 404
        if str(document['author_id']) != user_id_str: return jsonify(error="Forbidden"), 403
        if document['status'] not in ['Rejected', 'Changes Requested', 'Approved']: return jsonify(error="This document status cannot be amended"), 400

        # --- PATH A: Minor Revision ---
        if document['status'] == 'Changes Requested':
            file_id = fs.put(new_file, filename=new_file.filename, contentType=new_file.content_type)
            new_minor_version = document.get('minor_version', 0) + 1
            
            new_revision = {"revision_number": new_minor_version, "file_id": file_id, "filename": new_file.filename, "author_comment": request.form.get('comment', ''), "uploaded_at": datetime.datetime.now(datetime.timezone.utc)}
            history_entry = {"action": "Amended (Minor)", "user_id": ObjectId(user_id_str), "user_username": user.get('username'), "timestamp": datetime.datetime.now(datetime.timezone.utc), "details": f"Submitted new revision v{document['major_version']}.{new_minor_version}."}
            
            current_stage_num = document['current_stage']
            updated_workflow = document['workflow']
            for stage in updated_workflow:
                if stage['stage_number'] == current_stage_num:
                    for reviewer in stage['reviewers']: reviewer['status'] = 'Pending'
            
            db.documents.update_one(
                {'_id': doc_id_obj},
                {'$set': {'status': 'In QC' if current_stage_num == 0 else 'In Review', 'minor_version': new_minor_version, 'active_revision': len(document.get('revisions', [])), 'workflow': updated_workflow},
                 '$push': {'revisions': new_revision, 'history': history_entry}}
            )
            return jsonify(message="Document revised and resubmitted."), 200

        # --- PATH B: Major Version ---
        else:
            new_status_for_old_doc = 'Superseded' if document['status'] == 'Approved' else 'Archived'
            db.documents.update_one({'_id': doc_id_obj}, {'$set': {'status': new_status_for_old_doc}})

            file_id = fs.put(new_file, filename=new_file.filename, contentType=new_file.content_type)
            new_major_version = document.get('major_version', 0)
            if document['status'] == 'Approved': new_major_version += 1
            
            new_doc_metadata = {
                "doc_number": document['doc_number'], "major_version": new_major_version, "minor_version": 1, 
                "lineage_id": document['lineage_id'], "status": "Draft",
                "author_id": ObjectId(user_id_str), "author_username": user.get('username'),
                "created_at": datetime.datetime.now(datetime.timezone.utc),
                "tmf_metadata": document['tmf_metadata'], "workflow": [], "revisions": [], "active_revision": 0,
                "history": []
            }
            new_doc_metadata['revisions'].append({"revision_number": 1, "file_id": file_id, "filename": new_file.filename, "author_comment": request.form.get('comment', f'Initial draft v{new_major_version}.1'), "uploaded_at": datetime.datetime.now(datetime.timezone.utc)})
            new_doc_metadata['history'].append({"action": "Created (New Major)", "user_id": ObjectId(user_id_str), "user_username": user.get('username'), "timestamp": datetime.datetime.now(datetime.timezone.utc), "details": f"Created new draft v{new_major_version}.1."})
            
            result = db.documents.insert_one(new_doc_metadata)
            return jsonify({ "message": "New major version created.", "new_document_id": str(result.inserted_id) }), 201

    except Exception as e:
        print(f"Error in amend_document: {e}")
        return jsonify(error="An internal server error occurred"), 500
    
@document_workflow_blueprint.route('/<doc_id>/verify-signature', methods=['POST'])
@jwt_required()
def verify_document_signature(doc_id):
    """
    Verifies the digital signature of an approved document.
    """
    try:
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        # --- Validation ---
        if not document:
            return jsonify(error="Document not found"), 404
        if 'signature' not in document or 'signed_by' not in document:
            return jsonify(error="Document is not signed"), 400

        # --- Fetch Required Data ---
        signature = document['signature']
        signer_id = document['signed_by']

        signer = db.users.find_one({'_id': signer_id})
        if not signer or 'public_key' not in signer:
            return jsonify(error="Public key for the signer not found"), 404
        public_key = signer['public_key']

        active_rev = document['revisions'][document['active_revision']]
        file_id_to_verify = active_rev['file_id']
        file_content = fs.get(file_id_to_verify).read()

        # --- Perform Verification ---
        is_valid = verify_signature(public_key, file_content, signature)

        if is_valid:
            return jsonify(verified=True, message="Signature is valid."), 200
        else:
            return jsonify(verified=False, message="Signature is NOT valid."), 200

    except Exception as e:
        print(f"Error in verify_document_signature: {e}")
        return jsonify(error="An internal server error occurred during verification"), 500
    


# This one endpoint replaces /qc-review, /peer-review, and /final-approval
@document_workflow_blueprint.route('/<doc_id>/review', methods=['POST'])
@jwt_required()
def process_review_action(doc_id):
    try:
        user_id_obj = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id_obj})
        doc_id_obj = ObjectId(doc_id)
        document = db.documents.find_one({'_id': doc_id_obj})

        if not document: return jsonify(error="Document not found"), 404
        
        data = request.get_json()
        decision = data.get('decision')
        comment = data.get('comment', '')

        if decision not in ['Approved', 'ChangesRequested', 'Rejected', 'Pass', 'Fail']:
             return jsonify(error="Invalid decision provided"), 400
        if decision in ['Rejected', 'ChangesRequested', 'Fail'] and not comment:
             return jsonify(error="A comment is required for this decision"), 400

        current_stage_num = document.get('current_stage')
        current_stage = next((s for s in document['workflow'] if s['stage_number'] == current_stage_num), None)

        if not current_stage: return jsonify(error="Active workflow stage not found"), 400
        
        # --- Authorization ---
        reviewer_ids_in_stage = [r['user_id'] for r in current_stage['reviewers']]
        if user_id_obj not in reviewer_ids_in_stage and user.get('role') != 'Admin':
            return jsonify(error="Forbidden: You are not an active reviewer for this stage."), 403

        # --- Update the specific reviewer's status in the database ---
        db.documents.update_one(
            {'_id': doc_id_obj, 'workflow.stage_number': current_stage_num},
            {'$set': {'workflow.$[stage].reviewers.$[reviewer].status': decision}},
            array_filters=[{'stage.stage_number': current_stage_num}, {'reviewer.user_id': user_id_obj}]
        )
        
        # --- Handle Immediate Failures (Rejection or Changes Requested) ---
        history_action = f"{current_stage['stage_name']}: {decision}"
        history_entry = { "action": history_action, "user_id": user_id_obj, "user_username": user.get('username'), "timestamp": datetime.datetime.now(datetime.timezone.utc), "details": comment }

        if decision in ['Rejected', 'Fail']:
            db.documents.update_one({'_id': doc_id_obj}, {'$set': {'status': 'Rejected'}, '$push': {'history': history_entry}})
            return jsonify(message=f"Workflow terminated with decision: {decision}"), 200
        elif decision == 'ChangesRequested':
            db.documents.update_one({'_id': doc_id_obj}, {'$set': {'status': 'Changes Requested'}, '$push': {'history': history_entry}})
            return jsonify(message=f"Workflow paused with decision: {decision}"), 200

        # --- Handle Approvals (Pass or Approved) ---
        # Refetch the document to check the state of the whole stage
        updated_doc = db.documents.find_one({'_id': doc_id_obj})
        current_stage = next((s for s in updated_doc['workflow'] if s['stage_number'] == current_stage_num), None)
        all_reviewers_in_stage = current_stage['reviewers']
        
        stage_complete = False
        
        # --- THE "BRAIN" LOGIC ---
        if current_stage['review_type'] == 'parallel':
            if all(r['status'] in ['Approved', 'Pass'] for r in all_reviewers_in_stage):
                stage_complete = True
        
        elif current_stage['review_type'] == 'sequential':
            current_reviewer_index = -1
            for i, r in enumerate(all_reviewers_in_stage):
                if r['user_id'] == user_id_obj:
                    current_reviewer_index = i
                    break
            
            # Check if this was the LAST reviewer in the sequence
            if current_reviewer_index == len(all_reviewers_in_stage) - 1:
                stage_complete = True
            else:
                # Not complete yet, just log the history for this user's action
                db.documents.update_one({'_id': doc_id_obj}, {'$push': {'history': history_entry}})

        if stage_complete:
            is_final_stage = current_stage_num == len(updated_doc['workflow']) - 1
            if is_final_stage:
                # --- Final Approval & Digital Signature Logic ---
                private_key = user.get('private_key')
                if not private_key: return jsonify(error="Approver is missing a private key."), 500
                active_rev = updated_doc['revisions'][updated_doc['active_revision']]
                file_content = fs.get(active_rev['file_id']).read()
                signature = sign_data(private_key, file_content)
                new_major_version = updated_doc.get('major_version', 0) + 1
                
                db.documents.update_one(
                    {'_id': doc_id_obj},
                    {'$set': {'status': 'Approved', 'major_version': new_major_version, 'minor_version': 0, 'signature': signature, 'signed_by': user_id_obj, 'signed_by_username': user.get('username'), 'signed_at': datetime.datetime.now(datetime.timezone.utc)},
                     '$push': {'history': history_entry}}
                )
            else:
                # --- Advance to the next stage ---
                next_stage_num = current_stage_num + 1
                next_stage_data = next((s for s in updated_doc['workflow'] if s['stage_number'] == next_stage_num), None)
                new_status = "In Review" if next_stage_data and next_stage_data['role_required'] == 'Reviewer' else "Review Complete"
                
                db.documents.update_one(
                    {'_id': doc_id_obj},
                    {'$set': {'status': new_status, 'current_stage': next_stage_num},
                     '$push': {'history': history_entry}}
                )

        return jsonify(message="Review action processed successfully."), 200

    except Exception as e:
        print(f"Error in process_review_action: {e}")
        return jsonify(error="An internal server error occurred"), 500

