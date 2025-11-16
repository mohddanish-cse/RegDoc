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


def is_admin_or_author(user, doc):
    """Check if user is admin or document author"""
    return user['role'] == 'Admin' or doc['author_id'] == user['_id']


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
        due_date = data.get('due_date')
        
        if not qc_reviewer_ids:
            return jsonify({"error": "At least one QC reviewer must be selected"}), 400
        
        qc_reviewers = []
        for reviewer_id in qc_reviewer_ids:
            qc_reviewers.append({
                'user_id': ObjectId(reviewer_id),
                'status': 'Pending',
                'reviewed_at': None,
                'comment': ''
            })
        
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'In QC',
                'current_stage': 'QC',
                'qc_reviewers': qc_reviewers,
                'qc_due_date': due_date
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


@document_workflow_blueprint.route("/<doc_id>/submit-review-direct", methods=['POST'])
@jwt_required()
def submit_for_review_direct(doc_id):
    """Author submits draft document directly to technical reviewers (skip QC)"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
            
        if not is_admin_or_author(user, doc):
            return jsonify({"error": "Only author or admin can submit"}), 403
            
        if doc['status'] != 'Draft':
            return jsonify({"error": "Only draft documents can be submitted"}), 400
        
        data = request.get_json()
        reviewer_ids = data.get('reviewers', [])
        due_date = data.get('due_date')
        
        if not reviewer_ids:
            return jsonify({"error": "At least one reviewer must be selected"}), 400
        
        reviewers = []
        for reviewer_id in reviewer_ids:
            reviewers.append({
                'user_id': ObjectId(reviewer_id),
                'status': 'Pending',
                'reviewed_at': None,
                'comment': ''
            })
        
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'In Review',
                'current_stage': 'Technical Review',
                'reviewers': reviewers,
                'review_due_date': due_date,
                'qc_skipped': True  # Mark that QC was skipped
            },
            '$push': {
                'history': {
                    'action': 'Submitted for Technical Review (QC Skipped)',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': f"Low-risk document - QC skipped. Submitted to {len(reviewer_ids)} reviewer(s)"
                }
            }}
        )
        
        return jsonify({"message": "Document submitted for technical review (QC skipped)"}), 200
        
    except Exception as e:
        print(f"Error in submit_for_review_direct: {e}")
        return jsonify({"error": str(e)}), 500


@document_workflow_blueprint.route("/<doc_id>/qc-review", methods=['POST'])
@jwt_required()
def qc_review(doc_id):
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

        qc_reviewers = doc.get('qc_reviewers', [])
        reviewer_idx = next((i for i, r in enumerate(qc_reviewers) if r['user_id'] == user_id), None)

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

        qc_reviewers[reviewer_idx] = {
            'user_id': user_id,
            'status': decision,
            'reviewed_at': datetime.datetime.now(datetime.timezone.utc),
            'comment': comment
        }

        if user['role'] == 'Admin':
            if decision == 'Fail':
                new_status = 'QC Rejected'
                action_text = f"QC Rejected by Admin {user['username']}"
            else:
                new_status = 'QC Complete'
                action_text = f"QC Passed by Admin {user['username']}"
        else:
            any_failed = any(r['status'] == 'Fail' for r in qc_reviewers)
            all_done = all(r['status'] != 'Pending' for r in qc_reviewers)

            if any_failed:
                new_status = 'QC Rejected'
                action_text = f"QC Rejected by {user['username']}"
            elif all_done:
                new_status = 'QC Complete'
                action_text = "QC Review Completed - All Passed"
            else:
                new_status = 'In QC'
                action_text = f"QC {decision} by {user['username']}"

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
        due_date = data.get('due_date')
        
        if not reviewer_ids:
            return jsonify({"error": "At least one reviewer must be selected"}), 400
        
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
                'reviewers': reviewers,
                'review_due_date': due_date
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


# @document_workflow_blueprint.route("/<doc_id>/technical-review", methods=['POST'])
# @jwt_required()
# def technical_review(doc_id):
#     try:
#         user_id = ObjectId(get_jwt_identity())
#         user = db.users.find_one({'_id': user_id})
#         doc = db.documents.find_one({'_id': ObjectId(doc_id)})

#         if not doc or not user:
#             return jsonify({"error": "Document or user not found"}), 404

#         if doc['status'] != 'In Review':
#             return jsonify({"error": "Document is not in review"}), 400

#         data = request.get_json()
#         decision = data.get('decision')  # 'Approved', 'RequestChanges', 'RejectedCompletely'
#         comment = data.get('comment', '')

#         if decision not in ['Approved', 'RequestChanges', 'RejectedCompletely']:
#             return jsonify({"error": "Invalid decision"}), 400

#         # Handle Request Changes
#         if decision == 'RequestChanges':
#             db.documents.update_one(
#                 {'_id': ObjectId(doc_id)},
#                 {'$set': {
#                     'status': 'Under Revision',
#                     f'technical_reviews.{str(user_id)}.status': 'RequestChanges',
#                     f'technical_reviews.{str(user_id)}.comment': comment,
#                     f'technical_reviews.{str(user_id)}.reviewed_at': datetime.datetime.now(datetime.timezone.utc)
#                 },
#                     '$push': {
#                         'history': {
#                             'action': 'Technical Review - Changes Requested',
#                             'user_id': user_id,
#                             'user_username': user['username'],
#                             'timestamp': datetime.datetime.now(datetime.timezone.utc),
#                             'details': comment
#                         }
#                     }}
#             )
#             return jsonify({"message": "Changes requested - document returned to author"}), 200

#         # Handle Reject Completely (Withdrawn)
#         if decision == 'RejectedCompletely':
#             db.documents.update_one(
#                 {'_id': ObjectId(doc_id)},
#                 {'$set': {
#                     'status': 'Withdrawn',
#                     f'technical_reviews.{str(user_id)}.status': 'RejectedCompletely',
#                     f'technical_reviews.{str(user_id)}.comment': comment,
#                     f'technical_reviews.{str(user_id)}.reviewed_at': datetime.datetime.now(datetime.timezone.utc),
#                     'withdrawn_at': datetime.datetime.now(datetime.timezone.utc),
#                     'withdrawn_by': user['username']
#                 },
#                     '$push': {
#                         'history': {
#                             'action': 'Document Withdrawn (Rejected at Technical Review)',
#                             'user_id': user_id,
#                             'user_username': user['username'],
#                             'timestamp': datetime.datetime.now(datetime.timezone.utc),
#                             'details': comment
#                         }
#                     }}
#             )
#             return jsonify({"message": "Document withdrawn completely"}), 200

#         # Approved - Move to Pending Approval
#         db.documents.update_one(
#             {'_id': ObjectId(doc_id)},
#             {'$set': {
#                 'status': 'Pending Approval',
#                 f'technical_reviews.{str(user_id)}.status': 'Approved',
#                 f'technical_reviews.{str(user_id)}.comment': comment,
#                 f'technical_reviews.{str(user_id)}.reviewed_at': datetime.datetime.now(datetime.timezone.utc)
#             },
#                 '$push': {
#                     'history': {
#                         'action': 'Technical Review Approved',
#                         'user_id': user_id,
#                         'user_username': user['username'],
#                         'timestamp': datetime.datetime.now(datetime.timezone.utc),
#                         'details': 'Document approved for final approval'
#                     }
#                 }}
#         )
#         return jsonify({"message": "Technical review approved"}), 200

#     except Exception as e:
#         print(f"Error in technical_review: {e}")
#         return jsonify({"error": str(e)}), 500

@document_workflow_blueprint.route("/<doc_id>/technical-review", methods=['POST'])
@jwt_required()
def technical_review(doc_id):
    """Technical reviewer approves or requests changes"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
        
        if doc['status'] != 'In Review':
            return jsonify({"error": "Document is not in review"}), 400
        
        data = request.get_json()
        decision = data.get('decision')  # ✅ ONLY 'Approved' or 'RequestChanges'
        comment = data.get('comment', '')
        
        # ✅ FIX: Only allow 2 options
        if decision not in ['Approved', 'RequestChanges']:
            return jsonify({"error": "Invalid decision. Must be 'Approved' or 'RequestChanges'"}), 400
        
        # Get reviewers array
        reviewers = doc.get('reviewers', [])
        reviewer_idx = next((i for i, r in enumerate(reviewers) if r['user_id'] == user_id), None)
        
        if reviewer_idx is None:
            # Allow admin to review even if not assigned
            if user['role'] == 'Admin':
                reviewers.append({
                    'user_id': user_id,
                    'status': 'Pending',
                    'reviewed_at': None,
                    'comment': ''
                })
                reviewer_idx = len(reviewers) - 1
            else:
                return jsonify({"error": "You are not assigned as a reviewer"}), 403
        
        # ✅ Update this reviewer's status
        reviewers[reviewer_idx] = {
            'user_id': user_id,
            'status': decision,  # 'Approved' or 'RequestChanges'
            'reviewed_at': datetime.datetime.now(datetime.timezone.utc),
            'comment': comment
        }
        
        # ✅ FIX: Determine document status based on ALL reviewers
        any_changes_requested = any(r['status'] == 'RequestChanges' for r in reviewers)
        all_approved = all(r['status'] == 'Approved' for r in reviewers)
        
        if any_changes_requested:
            new_status = 'Under Revision'
            action_text = f"Technical Review - Changes Requested by {user['username']}"
        elif all_approved:
            new_status = 'Review Complete'  # ✅ Only when ALL approve
            action_text = "Technical Review Completed - All Reviewers Approved"
        else:
            new_status = 'In Review'  # Still waiting for some reviewers
            action_text = f"Technical Review - Approved by {user['username']}"
        
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
        
        if decision == 'Approved':
            return jsonify({"message": "Technical review approved"}), 200
        else:
            return jsonify({"message": "Changes requested - document returned to author"}), 200
            
    except Exception as e:
        print(f"Error in technical_review: {e}")
        return jsonify({"error": str(e)}), 500


# @document_workflow_blueprint.route("/<doc_id>/upload-corrected-file", methods=['POST'])
# @jwt_required()
# def upload_corrected_file(doc_id):
#     """Upload corrected file after reviewer requests changes - goes back to SAME reviewer"""
#     try:
#         user_id = ObjectId(get_jwt_identity())
#         user = db.users.find_one({'_id': user_id})
#         doc = db.documents.find_one({'_id': ObjectId(doc_id)})

#         if not doc or not user:
#             return jsonify({"error": "Document or user not found"}), 404

#         if doc['status'] != 'Under Revision':
#             return jsonify({"error": "Document is not under revision"}), 400

#         if doc['author_id'] != user_id:
#             return jsonify({"error": "Only the document author can upload corrections"}), 403

#         file = request.files.get('file')
#         if not file:
#             return jsonify({"error": "No file provided"}), 400

#         # Store new file in GridFS
#         file_id = fs.put(file, filename=file.filename, content_type=file.content_type)

#         # Increment minor version
#         new_minor_version = doc.get('minor_version', 0) + 1

#         # Add new revision
#         new_revision = {
#             'file_id': file_id,
#             'filename': file.filename,
#             'uploaded_by_id': user_id,
#             'uploaded_by_username': user['username'],
#             'uploaded_at': datetime.datetime.now(datetime.timezone.utc),
#             'version': f"{doc['major_version']}.{new_minor_version}",
#             'change_description': 'Corrections after reviewer feedback'
#         }

#         # Update document - back to "In Review" with SAME reviewers
#         db.documents.update_one(
#             {'_id': ObjectId(doc_id)},
#             {'$set': {
#                 'status': 'In Review',
#                 'minor_version': new_minor_version,
#                 'active_revision': len(doc['revisions'])
#             },
#                 '$push': {
#                     'revisions': new_revision,
#                     'history': {
#                         'action': 'Corrected File Uploaded',
#                         'user_id': user_id,
#                         'user_username': user['username'],
#                         'timestamp': datetime.datetime.now(datetime.timezone.utc),
#                         'details': f'Version {doc["major_version"]}.{new_minor_version} uploaded for re-review'
#                     }
#                 }}
#         )

#         return jsonify({
#             "message": "Corrected file uploaded - returned to reviewer",
#             "version": f"{doc['major_version']}.{new_minor_version}"
#         }), 200

#     except Exception as e:
#         print(f"Error uploading corrected file: {e}")
#         import traceback
#         return jsonify({"error": str(e)}), 500
@document_workflow_blueprint.route("/<doc_id>/upload-corrected-file", methods=['POST'])
@jwt_required()
def upload_corrected_file(doc_id):
    """Upload corrected file after reviewer requests changes - ✅ GOES BACK TO ALL REVIEWERS"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
        
        if doc['status'] != 'Under Revision':
            return jsonify({"error": "Document is not under revision"}), 400
        
        if doc['author_id'] != user_id:
            return jsonify({"error": "Only the document author can upload corrections"}), 403
        
        file = request.files.get('file')
        if not file:
            return jsonify({"error": "No file provided"}), 400
        
        # Store new file in GridFS
        file_id = fs.put(file, filename=file.filename, content_type=file.content_type)
        
        # ✅ KEEP: Increment minor version (as per your requirement)
        new_minor_version = doc.get('minor_version', 0) + 1
        
        # Add new revision
        new_revision = {
            'file_id': file_id,
            'filename': file.filename,
            'uploaded_by_id': user_id,
            'uploaded_by_username': user['username'],
            'uploaded_at': datetime.datetime.now(datetime.timezone.utc),
            'version': f"{doc['major_version']}.{new_minor_version}",
            'change_description': 'Corrections after reviewer feedback'
        }
        
        # ✅ FIX: Reset ALL reviewers to 'Pending'
        reviewers = doc.get('reviewers', [])
        for reviewer in reviewers:
            reviewer['status'] = 'Pending'
            reviewer['reviewed_at'] = None
            # Optionally preserve old comments for reference
            if 'comment' in reviewer and reviewer['comment']:
                reviewer['previous_comment'] = reviewer['comment']
            reviewer['comment'] = ''
        
        # Update document - back to "In Review" with ALL reviewers reset
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'In Review',
                'minor_version': new_minor_version,
                'active_revision': len(doc['revisions']),
                'reviewers': reviewers  # ✅ ALL reviewers reset
            },
            '$push': {
                'revisions': new_revision,
                'history': {
                    'action': 'Corrected File Uploaded',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': f'Version {doc["major_version"]}.{new_minor_version} uploaded - All reviewers notified for re-review'
                }
            }}
        )
        
        return jsonify({
            "message": "Corrected file uploaded - returned to ALL reviewers",
            "version": f"{doc['major_version']}.{new_minor_version}"
        }), 200
        
    except Exception as e:
        print(f"Error uploading corrected file: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


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
        due_date = data.get('due_date') 
        
        if not approver_id:
            return jsonify({"error": "Approver must be selected"}), 400
        
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'Pending Approval',
                'current_stage': 'Final Approval',
                'approver': {
                    'user_id': ObjectId(approver_id),
                    'status': 'Pending',
                    'approved_at': None,
                    'comment': '',
                    'due_date': due_date
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


# @document_workflow_blueprint.route("/<doc_id>/final-approval", methods=['POST'])
# @jwt_required()
# def final_approval(doc_id):
#     """Final approval with digital signature - increments major version and supersedes original if amendment"""
#     try:
#         user_id = ObjectId(get_jwt_identity())
#         user = db.users.find_one({'_id': user_id})
#         doc = db.documents.find_one({'_id': ObjectId(doc_id)})

#         if not doc or not user:
#             return jsonify({"error": "Document or user not found"}), 404

#         if doc['status'] != 'Pending Approval':
#             return jsonify({"error": "Document is not pending approval"}), 400

#         approver_data = doc.get('approver', {})
#         if str(approver_data.get('user_id')) != str(user_id) and user['role'] != 'Admin':
#             return jsonify({"error": "You are not the assigned approver"}), 403

#         data = request.get_json()
#         decision = data.get('decision')
#         comment = data.get('comment', '')

#         if decision not in ['Approved', 'RejectedWithRevisions', 'RejectedCompletely']:
#             return jsonify({"error": "Invalid decision"}), 400

#         # Handle Reject with Revisions
#         if decision == 'RejectedWithRevisions':
#             db.documents.update_one(
#                 {'_id': ObjectId(doc_id)},
#                 {'$set': {
#                     'status': 'Approval Rejected',
#                     'approver.status': 'RejectedWithRevisions',
#                     'approver.comment': comment,
#                     'approver.approved_at': datetime.datetime.now(datetime.timezone.utc)
#                 },
#                     '$push': {
#                         'history': {
#                             'action': 'Final Approval Rejected (Revisions Required)',
#                             'user_id': user_id,
#                             'user_username': user['username'],
#                             'timestamp': datetime.datetime.now(datetime.timezone.utc),
#                             'details': comment
#                         }
#                     }}
#             )
#             return jsonify({"message": "Document rejected - revisions required"}), 200

#         # Handle Reject Completely (Withdrawn)
#         if decision == 'RejectedCompletely':
#             db.documents.update_one(
#                 {'_id': ObjectId(doc_id)},
#                 {'$set': {
#                     'status': 'Withdrawn',
#                     'approver.status': 'RejectedCompletely',
#                     'approver.comment': comment,
#                     'approver.approved_at': datetime.datetime.now(datetime.timezone.utc),
#                     'withdrawn_at': datetime.datetime.now(datetime.timezone.utc),
#                     'withdrawn_by': user['username']
#                 },
#                     '$push': {
#                         'history': {
#                             'action': 'Document Withdrawn (Completely Rejected)',
#                             'user_id': user_id,
#                             'user_username': user['username'],
#                             'timestamp': datetime.datetime.now(datetime.timezone.utc),
#                             'details': comment
#                         }
#                     }}
#             )
#             return jsonify({"message": "Document withdrawn completely"}), 200

#         # ✅ APPROVED - Apply digital signature
#         try:
#             # Get revisions safely
#             revisions = doc.get('revisions', [])
#             if not revisions:
#                 return jsonify({"error": "Document has no file revisions"}), 400
            
#             active_rev_index = doc.get('active_revision', len(revisions) - 1)
#             if active_rev_index >= len(revisions):
#                 active_rev_index = len(revisions) - 1
            
#             active_rev = revisions[active_rev_index]
            
#             # Get file from GridFS
#             file_data = fs.get(active_rev['file_id']).read()
            
#             # Sign with user's private key
#             signature = sign_data(user['private_key'], file_data)
            
#         except Exception as sig_error:
#             print(f"Signature error: {sig_error}")
#             import traceback
#             traceback.print_exc()
#             return jsonify({"error": f"Failed to sign document: {str(sig_error)}"}), 500

#         # Calculate new version - Increment MAJOR version (v1.1 → v2.0)
#         new_major_version = doc.get('major_version', 0) + 1
#         new_minor_version = 0
        
#         # Update document to Approved status with signature
#         update_fields = {
#             'status': 'Approved',
#             'signature': signature,
#             'signed_by_id': user_id,
#             'signed_by_username': user['username'],
#             'signed_by_public_key': user['public_key'],
#             'signed_at': datetime.datetime.now(datetime.timezone.utc),
#             'major_version': new_major_version,
#             'minor_version': new_minor_version,
#             'approver.status': 'Approved',
#             'approver.comment': comment,
#             'approver.approved_at': datetime.datetime.now(datetime.timezone.utc)
#         }
        
#         db.documents.update_one(
#             {'_id': ObjectId(doc_id)},
#             {
#                 '$set': update_fields,
#                 '$push': {
#                     'history': {
#                         'action': 'Document Approved & Signed',
#                         'user_id': user_id,
#                         'user_username': user['username'],
#                         'timestamp': datetime.datetime.now(datetime.timezone.utc),
#                         'details': f"Document digitally signed. Version updated to {new_major_version}.{new_minor_version}. {comment}"
#                     }
#                 }
#             }
#         )
        
#         # ✅ If this is an amendment, mark the original document as Superseded
#         if 'amended_from' in doc and doc['amended_from']:
#             try:
#                 original_doc_id = ObjectId(doc['amended_from'])
#                 original_doc = db.documents.find_one({'_id': original_doc_id})
                
#                 if original_doc:
#                     db.documents.update_one(
#                         {'_id': original_doc_id},
#                         {
#                             '$set': {
#                                 'status': 'Superseded',
#                                 'superseded_by': str(doc['_id']),
#                                 'superseded_at': datetime.datetime.now(datetime.timezone.utc)
#                             },
#                             '$push': {
#                                 'history': {
#                                     'action': 'Superseded by Amendment',
#                                     'user_id': user_id,
#                                     'user_username': user['username'],
#                                     'timestamp': datetime.datetime.now(datetime.timezone.utc),
#                                     'details': f"Superseded by approved amendment v{new_major_version}.{new_minor_version}"
#                                 }
#                             }
#                         }
#                     )
#             except Exception as supersede_error:
#                 print(f"Warning: Could not supersede original document: {supersede_error}")
#                 # Don't fail approval if supersede fails
        
#         return jsonify({
#             "message": "Document approved and signed successfully",
#             "version": f"{new_major_version}.{new_minor_version}"
#         }), 200

#     except Exception as e:
#         print(f"Error in final_approval: {e}")
#         import traceback
#         traceback.print_exc()
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500
@document_workflow_blueprint.route("/<doc_id>/final-approval", methods=['POST'])
@jwt_required()
def final_approval(doc_id):
    """Final approval with digital signature - ✅ ONLY 2 OPTIONS: Approved or Rejected"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
        
        if doc['status'] != 'Pending Approval':
            return jsonify({"error": "Document is not pending approval"}), 400
        
        approver_data = doc.get('approver', {})
        if str(approver_data.get('user_id')) != str(user_id) and user['role'] != 'Admin':
            return jsonify({"error": "You are not the assigned approver"}), 403
        
        data = request.get_json()
        decision = data.get('decision')
        comment = data.get('comment', '')
        
        # ✅ FIX: Only allow 2 options
        if decision not in ['Approved', 'Rejected']:
            return jsonify({"error": "Invalid decision. Must be 'Approved' or 'Rejected'"}), 400
        
        # ✅ Handle Reject (back to Draft - full cycle)
        if decision == 'Rejected':
            db.documents.update_one(
                {'_id': ObjectId(doc_id)},
                {'$set': {
                    'status': 'Approval Rejected',
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
            return jsonify({"message": "Document rejected - must go through full cycle again"}), 200
        
        # ✅ APPROVED - Apply digital signature
        try:
            # Get revisions safely
            revisions = doc.get('revisions', [])
            if not revisions:
                return jsonify({"error": "Document has no file revisions"}), 400
            
            active_rev_index = doc.get('active_revision', len(revisions) - 1)
            if active_rev_index >= len(revisions):
                active_rev_index = len(revisions) - 1
            
            active_rev = revisions[active_rev_index]
            
            # Get file from GridFS
            file_data = fs.get(active_rev['file_id']).read()
            
            # Sign with user's private key
            signature = sign_data(user['private_key'], file_data)
            
        except Exception as sig_error:
            print(f"Signature error: {sig_error}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Failed to sign document: {str(sig_error)}"}), 500
        
        # ✅ KEEP: Increment MAJOR version (as per your requirement: v1.0 → v2.0)
        new_major_version = doc.get('major_version', 0) + 1
        new_minor_version = 0
        
        # Update document to Approved status with signature
        update_fields = {
            'status': 'Approved',
            'signature': signature,
            'signed_by_id': user_id,
            'signed_by_username': user['username'],
            'signed_by_public_key': user['public_key'],
            'signed_at': datetime.datetime.now(datetime.timezone.utc),
            'major_version': new_major_version,
            'minor_version': new_minor_version,
            'approver.status': 'Approved',
            'approver.comment': comment,
            'approver.approved_at': datetime.datetime.now(datetime.timezone.utc)
        }
        
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': update_fields,
            '$push': {
                'history': {
                    'action': 'Document Approved & Signed',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': f"Document digitally signed. Version updated to {new_major_version}.{new_minor_version}. {comment}"
                }
            }}
        )
        
        # ✅ KEEP: If this is an amendment, mark the original document as Superseded
        if 'amended_from' in doc and doc['amended_from']:
            try:
                original_doc_id = ObjectId(doc['amended_from'])
                original_doc = db.documents.find_one({'_id': original_doc_id})
                
                if original_doc:
                    db.documents.update_one(
                        {'_id': original_doc_id},
                        {'$set': {
                            'status': 'Superseded',
                            'superseded_by': str(doc['_id']),
                            'superseded_at': datetime.datetime.now(datetime.timezone.utc)
                        },
                        '$push': {
                            'history': {
                                'action': 'Superseded by Amendment',
                                'user_id': user_id,
                                'user_username': user['username'],
                                'timestamp': datetime.datetime.now(datetime.timezone.utc),
                                'details': f"Superseded by approved amendment v{new_major_version}.{new_minor_version}"
                            }
                        }}
                    )
            except Exception as supersede_error:
                print(f"Warning: Could not supersede original document: {supersede_error}")
        
        return jsonify({
            "message": "Document approved and signed successfully",
            "version": f"{new_major_version}.{new_minor_version}"
        }), 200
        
    except Exception as e:
        print(f"Error in final_approval: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



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


@document_workflow_blueprint.route("/<doc_id>/upload-revision", methods=['POST'])
@jwt_required()
def upload_revised_file(doc_id):
    """Author uploads a revised file after QC/Review/Approval rejection"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
            
        if not is_admin_or_author(user, doc):
            return jsonify({"error": "Only author or admin can upload revisions"}), 403
            
        if doc['status'] not in ['QC Rejected', 'Review Rejected', 'Approval Rejected']:
            return jsonify({"error": "Only rejected documents can have revisions uploaded"}), 400
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        file_id = fs.put(file, filename=file.filename, contentType=file.content_type)
        
        new_minor = doc.get('minor_version', 1) + 1
        
        new_revision = {
            "revision_number": len(doc.get('revisions', [])),
            "file_id": file_id,
            "filename": file.filename,
            "author_comment": request.form.get('comment', 'Revised after rejection'),
            "uploaded_at": datetime.datetime.now(datetime.timezone.utc)
        }
        
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'Draft',
                'minor_version': new_minor,
                'active_revision': new_revision['revision_number']
            },
            '$push': {
                'revisions': new_revision,
                'history': {
                    'action': 'Revision Uploaded',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': f"Uploaded revised file (v0.{new_minor}): {file.filename}"
                }
            }}
        )
        
        return jsonify({
            "message": "Revised file uploaded successfully",
            "new_version": f"0.{new_minor}"
        }), 200
        
    except Exception as e:
        print(f"Error in upload_revised_file: {e}")
        return jsonify({"error": str(e)}), 500


@document_workflow_blueprint.route("/<doc_id>/recall", methods=['POST'])
@jwt_required()
def recall_document(doc_id):
    """Author recalls document from QC/Review/Approval stages"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc or not user:
            return jsonify({"error": "Document or user not found"}), 404
            
        if not is_admin_or_author(user, doc):
            return jsonify({"error": "Only author or admin can recall documents"}), 403
            
        if doc['status'] not in ['In QC', 'In Review', 'Pending Approval']:
            return jsonify({"error": "Can only recall documents in QC, Review, or Approval stages"}), 400
        
        data = request.get_json()
        reason = data.get('reason', 'Recalled by author')
        
        current_status = doc['status']
        
        if current_status == 'In QC':
            new_status = 'Draft'
            clear_data = {
                'qc_reviewers': [],
                'reviewers': [],
                'approver': {}
            }
        elif current_status == 'In Review':
            new_status = 'QC Complete'
            clear_data = {
                'reviewers': [],
                'approver': {}
            }
        elif current_status == 'Pending Approval':
            new_status = 'Review Complete'
            clear_data = {
                'approver': {}
            }
        
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': new_status,
                **clear_data
            },
            '$push': {
                'history': {
                    'action': 'Document Recalled',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': f"{reason} (returned to {new_status})"
                }
            }}
        )
        
        return jsonify({"message": "Document recalled successfully", "new_status": new_status}), 200
        
    except Exception as e:
        print(f"Error in recall_document: {e}")
        return jsonify({"error": str(e)}), 500


@document_workflow_blueprint.route("/<doc_id>/archive", methods=['POST'])
@jwt_required()
def archive_document(doc_id):
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})

        if not user or not doc:
            return jsonify({"error": "User or document not found"}), 404

        # Check if user is an Archivist or Admin
        if user['role'] not in ['Archivist', 'Admin']:
            return jsonify({"error": "You do not have permission to archive documents"}), 403

        # Only documents in Approved or Superseded can be archived
        if doc['status'] not in ['Approved', 'Superseded']:
            return jsonify({"error": "Only Approved or Superseded documents can be archived"}), 400

        # Update status to Archived
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {'$set': {
                'status': 'Archived',
                'archived_at': datetime.datetime.now(datetime.timezone.utc),
                'archived_by_user_id': user_id,
                'archived_by_username': user['username']
            },
             '$push': {
                 'history': {
                    'action': 'Document Archived',
                    'user_id': user_id,
                    'user_username': user['username'],
                    'timestamp': datetime.datetime.now(datetime.timezone.utc),
                    'details': 'Document archived by user'
                 }
             }}
        )

        return jsonify({"message": "Document archived successfully"}), 200

    except Exception as e:
        print(f"Error in archive_document: {e}")
        return jsonify({"error": str(e)}), 500


@document_workflow_blueprint.route("/<doc_id>/amend", methods=['POST'])
@jwt_required()
def create_amendment(doc_id):
    """Create amendment of approved document - Only one amendment allowed at a time"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        original_doc = db.documents.find_one({'_id': ObjectId(doc_id)})

        if not original_doc or not user:
            return jsonify({"error": "Document or user not found"}), 404

        # Only approved documents can be amended
        if original_doc['status'] != 'Approved':
            return jsonify({"error": "Only approved documents can be amended"}), 400

        # ✅ NEW VALIDATION: Check if an amendment already exists and is in progress
        existing_amendment = db.documents.find_one({
            'amended_from': str(original_doc['_id']),
            'status': {'$in': ['Draft', 'In QC', 'QC Complete', 'In Review', 'Review Complete', 'Pending Approval']}
        })

        if existing_amendment:
            return jsonify({
                "error": f"An amendment (v{existing_amendment['major_version']}.{existing_amendment['minor_version']}) is already in progress. Please complete or withdraw it before creating a new amendment.",
                "existing_amendment_id": str(existing_amendment['_id']),
                "existing_version": f"{existing_amendment['major_version']}.{existing_amendment['minor_version']}",
                "existing_status": existing_amendment['status']
            }), 400

        # Get reason and file from form data (multipart)
        reason = request.form.get('reason')
        if not reason:
            return jsonify({"error": "Reason for amendment is required"}), 400

        # Get uploaded file
        if 'file' not in request.files:
            return jsonify({"error": "Amended document file is required"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Store file in GridFS
        file_id = fs.put(
            file,
            filename=file.filename,
            content_type=file.content_type,
            uploaded_by=user_id,
            uploaded_at=datetime.datetime.now(datetime.timezone.utc)
        )

        # Create new document with MINOR version increment (v1.0 → v1.1)
        new_doc = {
            'doc_number': original_doc['doc_number'],  # Same doc number
            'lineage_id': original_doc['lineage_id'],  # Same lineage
            'major_version': original_doc['major_version'],  # Keep major version
            'minor_version': original_doc.get('minor_version', 0) + 1,  # Increment minor
            'status': 'Draft',  # Starts as Draft
            'author_id': user_id,
            'author_username': user['username'],
            'created_at': datetime.datetime.now(datetime.timezone.utc),
            'tmf_metadata': original_doc.get('tmf_metadata', {}),
            'current_stage': None,
            'qc_reviewers': [],
            'reviewers': [],
            'approver': {},
            'revisions': [{
                'revision_number': 0,
                'file_id': file_id,
                'filename': file.filename,
                'uploaded_by_id': user_id,
                'uploaded_by_username': user['username'],
                'uploaded_at': datetime.datetime.now(datetime.timezone.utc)
            }],
            'active_revision': 0,
            'history': [{
                'action': 'Amendment Created',
                'user_id': user_id,
                'user_username': user['username'],
                'timestamp': datetime.datetime.now(datetime.timezone.utc),
                'details': f"Amendment from v{original_doc['major_version']}.{original_doc.get('minor_version', 0)} - Reason: {reason}"
            }],
            'amendment_reason': reason,
            'amended_from': str(original_doc['_id'])  # Reference to original
        }

        # Insert new document
        result = db.documents.insert_one(new_doc)

        # Add history to original document
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {
                '$push': {
                    'history': {
                        'action': 'Amended',
                        'user_id': user_id,
                        'user_username': user['username'],
                        'timestamp': datetime.datetime.now(datetime.timezone.utc),
                        'details': f'Amendment created - New draft v{new_doc["major_version"]}.{new_doc["minor_version"]}. Reason: {reason}'
                    }
                }
            }
        )

        return jsonify({
            "message": "Amendment created successfully",
            "new_document_id": str(result.inserted_id),
            "new_version": f"{new_doc['major_version']}.{new_doc['minor_version']}"
        }), 201

    except Exception as e:
        print(f"Error in create_amendment: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@document_workflow_blueprint.route("/<doc_id>/can-amend", methods=['GET'])
@jwt_required()
def can_amend_document(doc_id):
    """Check if a document can be amended (no amendment in progress)"""
    try:
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})
        
        if not doc:
            return jsonify({"error": "Document not found"}), 404
        
        # Check if document is approved
        if doc['status'] != 'Approved':
            return jsonify({
                "can_amend": False,
                "reason": "Only approved documents can be amended"
            }), 200
        
        # Check if an amendment already exists and is in progress
        existing_amendment = db.documents.find_one({
            'amended_from': str(doc['_id']),
            'status': {'$in': ['Draft', 'In QC', 'QC Complete', 'In Review', 'Review Complete', 'Pending Approval']}
        })
        
        if existing_amendment:
            return jsonify({
                "can_amend": False,
                "reason": f"Amendment v{existing_amendment['major_version']}.{existing_amendment['minor_version']} is already in progress",
                "existing_amendment": {
                    "id": str(existing_amendment['_id']),
                    "version": f"{existing_amendment['major_version']}.{existing_amendment['minor_version']}",
                    "status": existing_amendment['status']
                }
            }), 200
        
        return jsonify({"can_amend": True}), 200
        
    except Exception as e:
        print(f"Error checking amendment status: {e}")
        return jsonify({"error": str(e)}), 500
