# backend/app/document_workflow_routes.py

import datetime
from flask import Blueprint, jsonify, request
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
from .crypto_utils import sign_data, verify_signature
import gridfs

document_workflow_blueprint = Blueprint('document_workflow', __name__)
fs = gridfs.GridFS(db)


# ==================== HELPER FUNCTIONS ====================
def is_admin_or_author(user, doc):
    """Check if user is admin or document author"""
    return user['role'] == 'Admin' or doc['author_id'] == user['_id']


# ==================== STAGE 1: SUBMIT FOR QC ====================
@document_workflow_blueprint.route("/<doc_id>/submit-qc", methods=['POST'])
@jwt_required()
def submit_for_qc(doc_id):
    """Author submits document to QC reviewers"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
            
        if not is_admin_or_author(user, doc):
            return jsonify({"error": "Only author or admin can submit"}), 403
            
        if doc['status'] != 'Draft':
            return jsonify({"error": "Only draft documents can be submitted to QC"}), 400
        
        data = request.get_json()
        qc_reviewer_ids = data.get('qc_reviewers', [])
        
        if not qc_reviewer_ids:
            return jsonify({"error": "At least one QC reviewer must be selected"}), 400
        
        # Create QC stage
        qc_reviewers = []
        for reviewer_id in qc_reviewer_ids:
            qc_reviewers.append({
                'user_id': ObjectId(reviewer_id),
                'status': 'Pending',
                'reviewed_at': None,
                'comment': ''
            })
        
        # Update document
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'In QC',
                'current_stage': 'QC',
                'qc_reviewers': qc_reviewers
            },
            '$push': {
                'history': {
                    'action': 'Submitted for QC',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': f"Submitted to {len(qc_reviewer_ids)} QC reviewer(s)"
                }
            }}
        )
        
        return jsonify({"message": "Document submitted to QC successfully"}), 200
        
    except Exception as e:
        print(f"Error in submit_for_qc: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== STAGE 2: QC REVIEW ====================
@document_workflow_blueprint.route("/<doc_id>/qc-review", methods=['POST'])
@jwt_required()
def qc_review(doc_id):
    """QC reviewer passes or fails the document"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
        
        if doc['status'] != 'In QC':
            return jsonify({"error": "Document is not in QC stage"}), 400
        
        data = request.get_json()
        decision = data.get('decision')  # 'Pass' or 'Fail'
        comment = data.get('comment', '')
        
        if decision not in ['Pass', 'Fail']:
            return jsonify({"error": "Invalid decision"}), 400
        
        # Find reviewer in QC list
        qc_reviewers = doc.get('qc_reviewers', [])
        reviewer_idx = next((i for i, r in enumerate(qc_reviewers) if r['user_id'] == user_id), None)
        
        # Admin bypass: if not in list, add them
        if reviewer_idx is None:
            if user['role'] == 'Admin':
                qc_reviewers.append({
                    'user_id': user_id,
                    'status': 'Pending',
                    'reviewed_at': None,
                    'comment': ''
                })
                reviewer_idx = len(qc_reviewers) - 1
            else:
                return jsonify({"error": "You are not assigned as QC reviewer"}), 403
        
        # Update reviewer status
        qc_reviewers[reviewer_idx] = {
            'user_id': user_id,
            'status': decision,
            'reviewed_at': datetime.datetime.now(datetime.timezone.utc),
            'comment': comment
        }
        
        # Check completion - Admin can override
        if user['role'] == 'Admin':
            # Admin decision is final
            if decision == 'Fail':
                new_status = 'Draft'
                action_text = f"QC Failed by Admin {user['username']}"
            else:
                new_status = 'QC Complete'
                action_text = f"QC Passed by Admin {user['username']}"
        else:
            # Regular QC reviewer logic
            all_reviewers_done = all(r['status'] != 'Pending' for r in qc_reviewers)
            any_failed = any(r['status'] == 'Fail' for r in qc_reviewers)
            
            if any_failed:
                new_status = 'Draft'
                action_text = f"QC Failed by {user['username']}"
            elif all_reviewers_done:
                new_status = 'QC Complete'
                action_text = "QC Review Completed - All Passed"
            else:
                new_status = 'In QC'
                action_text = f"QC {decision} by {user['username']}"

        
        # Update document
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': new_status,
                'qc_reviewers': qc_reviewers
            },
            '$push': {
                'history': {
                    'action': action_text,
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': comment
                }
            }}
        )
        
        return jsonify({"message": f"QC Review: {decision}"}), 200
        
    except Exception as e:
        print(f"Error in qc_review: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== STAGE 3: SUBMIT FOR TECHNICAL REVIEW ====================
@document_workflow_blueprint.route("/<doc_id>/submit-review", methods=['POST'])
@jwt_required()
def submit_for_review(doc_id):
    """Author submits QC-passed document to technical reviewers"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
            
        if not is_admin_or_author(user, doc):
            return jsonify({"error": "Only author or admin can submit"}), 403
            
        if doc['status'] != 'QC Complete':
            return jsonify({"error": "Document must complete QC first"}), 400
        
        data = request.get_json()
        reviewer_ids = data.get('reviewers', [])
        
        if not reviewer_ids:
            return jsonify({"error": "At least one reviewer must be selected"}), 400
        
        # Create review stage
        reviewers = []
        for reviewer_id in reviewer_ids:
            reviewers.append({
                'user_id': ObjectId(reviewer_id),
                'status': 'Pending',
                'reviewed_at': None,
                'comment': ''
            })
        
        # Update document
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'In Review',
                'current_stage': 'Technical Review',
                'reviewers': reviewers
            },
            '$push': {
                'history': {
                    'action': 'Submitted for Technical Review',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': f"Submitted to {len(reviewer_ids)} reviewer(s)"
                }
            }}
        )
        
        return jsonify({"message": "Document submitted for technical review"}), 200
        
    except Exception as e:
        print(f"Error in submit_for_review: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== STAGE 4: TECHNICAL REVIEW ====================
@document_workflow_blueprint.route("/<doc_id>/technical-review", methods=['POST'])
@jwt_required()
def technical_review(doc_id):
    """Technical reviewer approves/rejects document"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
        
        if doc['status'] != 'In Review':
            return jsonify({"error": "Document is not in review stage"}), 400
        
        data = request.get_json()
        decision = data.get('decision')  # 'Approved', 'ChangesRequested', 'Rejected'
        comment = data.get('comment', '')
        
        if decision not in ['Approved', 'ChangesRequested', 'Rejected']:
            return jsonify({"error": "Invalid decision"}), 400
        
        # Find reviewer
        reviewers = doc.get('reviewers', [])
        reviewer_idx = next((i for i, r in enumerate(reviewers) if r['user_id'] == user_id), None)
        
        # Admin bypass
        if reviewer_idx is None:
            if user['role'] == 'Admin':
                reviewers.append({
                    'user_id': user_id,
                    'status': 'Pending',
                    'reviewed_at': None,
                    'comment': ''
                })
                reviewer_idx = len(reviewers) - 1
            else:
                return jsonify({"error": "You are not assigned as reviewer"}), 403
        
        # Update reviewer status
        reviewers[reviewer_idx] = {
            'user_id': user_id,
            'status': decision,
            'reviewed_at': datetime.datetime.now(datetime.timezone.utc),
            'comment': comment
        }
        
        # Check completion - Admin can override
        if user['role'] == 'Admin':
            # Admin decision is final
            if decision in ['Rejected', 'ChangesRequested']:
                new_status = 'Draft'
                action_text = f"Technical Review {decision} by Admin {user['username']}"
            else:
                new_status = 'Review Complete'
                action_text = f"Technical Review Approved by Admin {user['username']}"
        else:
            # Regular reviewer logic
            all_reviewers_done = all(r['status'] != 'Pending' for r in reviewers)
            any_rejected = any(r['status'] in ['Rejected', 'ChangesRequested'] for r in reviewers)
            all_approved = all(r['status'] == 'Approved' for r in reviewers if r['status'] != 'Pending')
            
            if any_rejected:
                new_status = 'Draft'
                action_text = f"Technical Review Rejected by {user['username']}"
            elif all_reviewers_done and all_approved:
                new_status = 'Review Complete'
                action_text = "Technical Review Completed - All Approved"
            else:
                new_status = 'In Review'
                action_text = f"Technical Review {decision} by {user['username']}"

        
        # Update document
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': new_status,
                'reviewers': reviewers
            },
            '$push': {
                'history': {
                    'action': action_text,
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': comment
                }
            }}
        )
        
        return jsonify({"message": f"Review: {decision}"}), 200
        
    except Exception as e:
        print(f"Error in technical_review: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== STAGE 5: SUBMIT FOR APPROVAL ====================
@document_workflow_blueprint.route("/<doc_id>/submit-approval", methods=['POST'])
@jwt_required()
def submit_for_approval(doc_id):
    """Author submits reviewed document to approver"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
            
        if not is_admin_or_author(user, doc):
            return jsonify({"error": "Only author or admin can submit"}), 403
            
        if doc['status'] != 'Review Complete':
            return jsonify({"error": "Document must complete technical review first"}), 400
        
        data = request.get_json()
        approver_id = data.get('approver')
        
        if not approver_id:
            return jsonify({"error": "Approver must be selected"}), 400
        
        # Update document
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'Pending Approval',
                'current_stage': 'Final Approval',
                'approver': {
                    'user_id': ObjectId(approver_id),
                    'status': 'Pending',
                    'approved_at': None,
                    'comment': ''
                }
            },
            '$push': {
                'history': {
                    'action': 'Submitted for Final Approval',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': 'Submitted for final approval and signature'
                }
            }}
        )
        
        return jsonify({"message": "Document submitted for final approval"}), 200
        
    except Exception as e:
        print(f"Error in submit_for_approval: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== STAGE 6: FINAL APPROVAL & SIGNATURE ====================
@document_workflow_blueprint.route("/<doc_id>/final-approval", methods=['POST'])
@jwt_required()
def final_approval(doc_id):
    """Approver signs and locks the document"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
        
        if doc['status'] != 'Pending Approval':
            return jsonify({"error": "Document is not pending approval"}), 400
        
        approver_data = doc.get('approver', {})
        if approver_data.get('user_id') != user_id and user['role'] != 'Admin':
            return jsonify({"error": "You are not the assigned approver"}), 403
        
        data = request.get_json()
        decision = data.get('decision')  # 'Approved' or 'Rejected'
        comment = data.get('comment', '')
        
        if decision not in ['Approved', 'Rejected']:
            return jsonify({"error": "Invalid decision"}), 400
        
        if decision == 'Rejected':
            db.documents.update_one(
                {'_id': ObjectId(doc_id)},
                {'$set': {
                    'status': 'Draft',
                    'approver.status': 'Rejected',
                    'approver.comment': comment,
                    'approver.approved_at': datetime.datetime.now(datetime.timezone.utc)
                },
                '$push': {
                    'history': {
                        'action': 'Final Approval Rejected',
                        'user_id': user_id,
                        'user_username': user['username'],
                        'timestamp': datetime.datetime.now(datetime.timezone.utc),
                        'details': comment
                    }
                }}
            )
            return jsonify({"message": "Document rejected"}), 200
        
        # Approved - Apply digital signature
        active_rev = doc['revisions'][doc.get('active_revision', 0)]
        file_data = fs.get(active_rev['file_id']).read()
        signature = sign_data(user['private_key'], file_data)
        
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'Approved',
                'signature': signature,
                'signed_by_username': user['username'],
                'signed_at': datetime.datetime.now(datetime.timezone.utc),
                'major_version': doc['major_version'] + 1,
                'minor_version': 0,
                'approver.status': 'Approved',
                'approver.comment': comment,
                'approver.approved_at': datetime.datetime.now(datetime.timezone.utc)
            },
            '$push': {
                'history': {
                    'action': 'Document Approved & Signed',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': f"Document digitally signed. Version updated to {doc['major_version'] + 1}.0"
                }
            }}
        )
        
        return jsonify({"message": "Document approved and signed successfully"}), 200
        
    except Exception as e:
        print(f"Error in final_approval: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== AMENDMENT ====================
@document_workflow_blueprint.route("/<doc_id>/amend", methods=['POST'])
@jwt_required()
def create_amendment(doc_id):
    """Creates new version of approved document"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        original_doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not original_doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
        
        if original_doc['status'] != 'Approved':
            return jsonify({"error": "Only approved documents can be amended"}), 400
        
        data = request.get_json()
        amendment_type = data.get('amendment_type', 'minor')
        reason = data.get('reason', '')
        
        active_rev = original_doc['revisions'][original_doc.get('active_revision', 0)]
        
        new_doc = {
            'doc_number': original_doc['doc_number'],
            'lineage_id': original_doc['lineage_id'],
            'status': 'Draft',
            'author_id': user_id,
            'author_username': user['username'],
            'created_at': datetime.datetime.now(datetime.timezone.utc),
            'tmf_metadata': original_doc['tmf_metadata'],
            'current_stage': None,
            'qc_reviewers': [],
            'reviewers': [],
            'approver': {},
            'revisions': [active_rev],
            'active_revision': 0,
            'history': [{
                'action': 'Amendment Created',
                'user_id': user_id,
                'user_username': user['username'],
                'timestamp': datetime.datetime.now(datetime.timezone.utc),
                'details': f"Amendment from v{original_doc['major_version']}.0 - {reason}"
            }]
        }
        
        if amendment_type == 'major':
            new_doc['major_version'] = original_doc['major_version'] + 1
            new_doc['minor_version'] = 0
        else:
            new_doc['major_version'] = original_doc['major_version']
            new_doc['minor_version'] = original_doc.get('minor_version', 0) + 1
        
        result = db.documents.insert_one(new_doc)
        
        return jsonify({
            "message": "Amendment created",
            "new_document_id": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Error in create_amendment: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== VERIFY SIGNATURE ====================
@document_workflow_blueprint.route("/<doc_id>/verify-signature", methods=['POST'])
@jwt_required()
def verify_doc_signature(doc_id):
    try:
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        if not doc or 'signature' not in doc:
            return jsonify({"error": "Document or signature not found"}), 404
        
        signed_by_user = db.users.find_one({'username': doc['signed_by_username']})
        active_rev = doc['revisions'][doc.get('active_revision', 0)]
        file_data = fs.get(active_rev['file_id']).read()
        
        is_valid = verify_signature(signed_by_user['public_key'], file_data, doc['signature'])
        
        return jsonify({"verified": is_valid}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
