# backend/routes/document_lifecycle_routes.py

import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId
import gridfs
from . import db

document_lifecycle_blueprint = Blueprint('document_lifecycle', __name__)
fs = gridfs.GridFS(db)


def is_admin(user):
    """Check if user is admin"""
    return user['role'] == 'Admin'


# ================================
# ARCHIVE DOCUMENT
# ================================
@document_lifecycle_blueprint.route("/<doc_id>/archive", methods=['POST'])
@jwt_required()
def archive_document(doc_id):
    """
    Archive approved or superseded documents for long-term storage.
    Archivist or Admin can archive.
    """
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})

        if not user or not doc:
            return jsonify({"error": "User or document not found"}), 404

        # Admin can do all actions, or Archivist role
        if not is_admin(user) and user['role'] != 'Archivist':
            return jsonify({"error": "You do not have permission to archive documents"}), 403

        # Only Approved or Superseded documents can be archived
        if doc['status'] not in ['Approved', 'Superseded']:
            return jsonify({"error": "Only Approved or Superseded documents can be archived"}), 400

        # Update status to Archived
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {
                '$set': {
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
                        'details': 'Document moved to long-term archive storage'
                    }
                }
            }
        )

        return jsonify({"message": "Document archived successfully"}), 200

    except Exception as e:
        print(f"Error in archive_document: {e}")
        return jsonify({"error": str(e)}), 500


# ================================
# CREATE AMENDMENT
# ================================
@document_lifecycle_blueprint.route("/<doc_id>/amend", methods=['POST'])
@jwt_required()
def create_amendment(doc_id):
    """
    Create amendment of approved document.
    Only one amendment allowed at a time per document.
    Creates new draft with incremented minor version (v1.0 → v1.1).
    """
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        original_doc = db.documents.find_one({'_id': ObjectId(doc_id)})

        if not original_doc or not user:
            return jsonify({"error": "Document or user not found"}), 404

        # Only approved documents can be amended
        if original_doc['status'] != 'Approved':
            return jsonify({"error": "Only approved documents can be amended"}), 400

        # Check if an amendment already exists and is in progress
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
            'doc_number': original_doc['doc_number'],
            'lineage_id': original_doc['lineage_id'],
            'major_version': original_doc['major_version'],
            'minor_version': original_doc.get('minor_version', 0) + 1,
            'status': 'Draft',
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
            'amended_from': str(original_doc['_id'])
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


# ================================
# CHECK IF AMENDMENT ALLOWED
# ================================
@document_lifecycle_blueprint.route("/<doc_id>/can-amend", methods=['GET'])
@jwt_required()
def can_amend_document(doc_id):
    """
    Check if a document can be amended.
    Returns false if amendment already in progress.
    """
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


# ================================
# WITHDRAW DOCUMENT
# ================================
@document_lifecycle_blueprint.route("/<doc_id>/withdraw", methods=['POST'])
@jwt_required()
def withdraw_document(doc_id):
    """
    Withdraw document (cancel before it was ever used).
    Available for: Draft, In QC, In Review, Pending Approval, Rejected statuses.
    Author or Admin only.
    """
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})

        if not user or not doc:
            return jsonify({"error": "User or document not found"}), 404

        # Admin can do all actions, or must be document author
        if not is_admin(user) and doc['author_id'] != user_id:
            return jsonify({"error": "You do not have permission to withdraw this document"}), 403

        # Only these statuses can be withdrawn
        withdrawable_statuses = [
            'Draft', 'In QC', 'In Review', 'Pending Approval', 
            'QC Rejected', 'Review Rejected', 'Approval Rejected', 'Under Revision'
        ]
        
        if doc['status'] not in withdrawable_statuses:
            return jsonify({"error": f"Documents with status '{doc['status']}' cannot be withdrawn"}), 400

        # Get withdrawal reason
        data = request.get_json()
        reason = data.get('reason', 'No reason provided')

        # Update status to Withdrawn
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {
                '$set': {
                    'status': 'Withdrawn',
                    'withdrawn_at': datetime.datetime.now(datetime.timezone.utc),
                    'withdrawn_by_user_id': user_id,
                    'withdrawn_by_username': user['username'],
                    'withdrawal_reason': reason
                },
                '$push': {
                    'history': {
                        'action': 'Document Withdrawn',
                        'user_id': user_id,
                        'user_username': user['username'],
                        'timestamp': datetime.datetime.now(datetime.timezone.utc),
                        'details': f'Document withdrawn - Reason: {reason}'
                    }
                }
            }
        )

        return jsonify({"message": "Document withdrawn successfully"}), 200

    except Exception as e:
        print(f"Error in withdraw_document: {e}")
        return jsonify({"error": str(e)}), 500


# ================================
# MARK DOCUMENT AS OBSOLETE
# ================================
@document_lifecycle_blueprint.route("/<doc_id>/mark-obsolete", methods=['POST'])
@jwt_required()
def mark_document_obsolete(doc_id):
    """
    Mark approved document as obsolete (content no longer valid).
    Admin or Quality Manager only.
    Only Approved documents can be marked obsolete.
    """
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        doc = db.documents.find_one({'_id': ObjectId(doc_id)})

        if not user or not doc:
            return jsonify({"error": "User or document not found"}), 404

        # Admin can do all actions, or Quality Manager role
        if not is_admin(user) and user['role'] != 'Quality Manager':
            return jsonify({"error": "You do not have permission to mark documents as obsolete"}), 403

        # Only Approved documents can be marked obsolete
        if doc['status'] != 'Approved':
            return jsonify({"error": "Only Approved documents can be marked as obsolete"}), 400

        # Get obsolescence reason (required)
        data = request.get_json()
        reason = data.get('reason')
        
        if not reason:
            return jsonify({"error": "Reason for marking document as obsolete is required"}), 400

        # Update status to Obsolete
        db.documents.update_one(
            {'_id': ObjectId(doc_id)},
            {
                '$set': {
                    'status': 'Obsolete',
                    'obsolete_at': datetime.datetime.now(datetime.timezone.utc),
                    'obsolete_by_user_id': user_id,
                    'obsolete_by_username': user['username'],
                    'obsolescence_reason': reason
                },
                '$push': {
                    'history': {
                        'action': 'Document Marked Obsolete',
                        'user_id': user_id,
                        'user_username': user['username'],
                        'timestamp': datetime.datetime.now(datetime.timezone.utc),
                        'details': f'Document marked as obsolete - Reason: {reason}'
                    }
                }
            }
        )

        return jsonify({"message": "Document marked as obsolete successfully"}), 200

    except Exception as e:
        print(f"Error in mark_document_obsolete: {e}")
        return jsonify({"error": str(e)}), 500


@document_lifecycle_blueprint.route("/<string:document_id>", methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    """
    Delete a document (only allowed for Draft and Withdrawn status).
    Only author or admin can delete.
    """
    import gridfs
    from bson.objectid import ObjectId
    
    fs = gridfs.GridFS(db)
    
    try:
        # Get current user
        user_id_str = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(user_id_str)})
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get document from MongoDB
        try:
            document = db.documents.find_one({"_id": ObjectId(document_id)})
        except:
            return jsonify({"error": "Invalid document ID"}), 400
        
        if not document:
            return jsonify({"error": "Document not found"}), 404

        # Extract document details
        revisions = document.get('revisions', [])
        filename = revisions[0].get('filename', 'Unknown') if revisions else 'Unknown'
        status = document.get('status', '')
        author_id = document.get('author_id')
        doc_number = document.get('doc_number', 'N/A')

        # Check permissions: only author or admin can delete
        if str(author_id) != user_id_str and user.get('role') != 'Admin':
            return jsonify({"error": "Unauthorized to delete this document"}), 403

        # Check status: only Draft and Withdrawn can be deleted
        if status not in ['Draft', 'Withdrawn']:
            return jsonify({
                "error": f"Cannot delete document with status '{status}'. Only 'Draft' and 'Withdrawn' documents can be deleted."
            }), 400

        # ✅ Delete ALL revision files from GridFS
        for revision in revisions:
            file_id = revision.get('file_id')
            if file_id:
                try:
                    fs.delete(file_id)
                    print(f"✅ Deleted GridFS file: {file_id}")
                except Exception as e:
                    print(f"⚠️ Warning: Could not delete GridFS file {file_id}: {e}")

        # ✅ Delete document from MongoDB
        result = db.documents.delete_one({"_id": ObjectId(document_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Failed to delete document from database"}), 500

        print(f"✅ Deleted document: {doc_number} ({filename}) by {user.get('username')}")
        
        return jsonify({
            "message": f"Document '{filename}' ({doc_number}) deleted successfully"
        }), 200

    except Exception as e:
        print(f"❌ Error deleting document: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete document: {str(e)}"}), 500
