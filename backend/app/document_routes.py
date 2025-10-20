# backend/app/document_routes.py

import datetime
import uuid
from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
from bson.objectid import ObjectId

# --- Blueprint for document creation and basic data ---
document_blueprint = Blueprint('documents', __name__)

fs = gridfs.GridFS(db)

def get_next_sequence(name):
    ret = db.counters.find_one_and_update(
        {'_id': name}, {'$inc': {'seq': 1}},
        return_document=True, upsert=True
    )
    return ret['seq']

@document_blueprint.route("/upload", methods=['POST'])
@jwt_required()
def upload_document():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        user_id_str = get_jwt_identity()
        user = db.users.find_one({'_id': ObjectId(user_id_str)})
        if not user:
            return jsonify({"error": "Authenticated user not found"}), 404

        tmf_metadata = {
            "study_id": request.form.get("study_id", ''),
            "country": request.form.get("country", ''),
            "site_id": request.form.get("site_id", ''),
            "tmf_zone": request.form.get("tmf_zone", ''),
            "tmf_section": request.form.get("tmf_section", ''),
            "tmf_artifact": request.form.get("tmf_artifact", '')
        }

        file_id = fs.put(file, filename=file.filename, contentType=file.content_type)
        doc_seq = get_next_sequence('document_id')
        doc_number = f"REG-TMF-{doc_seq:05d}"

        first_revision = {
            "revision_number": 0, "file_id": file_id, "filename": file.filename,
            "author_comment": request.form.get('comment', 'Initial version.'),
            "uploaded_at": datetime.datetime.now(datetime.timezone.utc)
        }

        document_metadata = {
            "doc_number": doc_number, "major_version": 1, "minor_version": 0,
            "lineage_id": str(uuid.uuid4()), "status": "Draft",
            "author_id": ObjectId(user_id_str), "author_username": user.get('username'),
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "tmf_metadata": tmf_metadata, "workflow": [], "revisions": [first_revision],
            "active_revision": 0,
            "history": [{
                "action": "Created", "user_id": ObjectId(user_id_str),
                "user_username": user.get('username'),
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "details": f"Document created: {file.filename}"
            }]
        }

        db.documents.insert_one(document_metadata)
        return jsonify({"message": "Document uploaded", "doc_number": doc_number}), 201

    except Exception as e:
        print(f"Error in upload_document: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@document_blueprint.route("/my-tasks", methods=['GET'])
@jwt_required()
def get_my_tasks():
    """Get documents assigned to current user for review"""
    try:
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        documents = []
        
        # QC assigned documents
        qc_docs = list(db.documents.find({
            'status': 'In QC',
            'qc_reviewers': {
                '$elemMatch': {
                    'user_id': user_id,
                    'status': 'Pending'
                }
            }
        }))
        
        # Technical review assigned documents
        review_docs = list(db.documents.find({
            'status': 'In Review',
            'reviewers': {
                '$elemMatch': {
                    'user_id': user_id,
                    'status': 'Pending'
                }
            }
        }))
        
        # Approval assigned documents
        approval_docs = list(db.documents.find({
            'status': 'Pending Approval',
            'approver.user_id': user_id,
            'approver.status': 'Pending'
        }))
        
        # Draft/intermediate documents authored by user
        draft_docs = list(db.documents.find({
            'author_id': user_id,
            'status': {'$in': ['Draft', 'QC Complete', 'Review Complete']}
        }))
        
        # Combine all
        all_docs = qc_docs + review_docs + approval_docs + draft_docs
        
        # Remove duplicates
        seen_ids = set()
        unique_docs = []
        for doc in all_docs:
            doc_id = str(doc['_id'])
            if doc_id not in seen_ids:
                seen_ids.add(doc_id)
                unique_docs.append(doc)
        
        # Format response
        for doc in unique_docs:
            doc['id'] = str(doc['_id'])
            del doc['_id']
            
            # Convert author_id
            original_author_id = doc.get('author_id')
            if original_author_id:
                doc['author_id'] = str(original_author_id)
                # Get author username
                if 'author_username' not in doc:
                    author = db.users.find_one({'_id': original_author_id})
                    doc['author_username'] = author['username'] if author else 'Unknown'
            
            # Ensure doc_number exists
            if 'doc_number' not in doc:
                doc['doc_number'] = 'N/A'
            
            # Build version string
            major = doc.get('major_version', 1)
            minor = doc.get('minor_version', 0)
            doc['version'] = f"{major}.{minor}"
            
            # Get filename from revisions
            if 'revisions' in doc and len(doc['revisions']) > 0:
                active_rev_idx = doc.get('active_revision', 0)
                doc['filename'] = doc['revisions'][active_rev_idx].get('filename', 'Unknown')
            
            # Convert QC reviewers
            if 'qc_reviewers' in doc:
                for reviewer in doc['qc_reviewers']:
                    reviewer['user_id'] = str(reviewer['user_id'])
                    if reviewer.get('reviewed_at'):
                        reviewer['reviewed_at'] = reviewer['reviewed_at'].isoformat()
            
            # Convert technical reviewers
            if 'reviewers' in doc:
                for reviewer in doc['reviewers']:
                    reviewer['user_id'] = str(reviewer['user_id'])
                    if reviewer.get('reviewed_at'):
                        reviewer['reviewed_at'] = reviewer['reviewed_at'].isoformat()
            
            # Convert approver
            if 'approver' in doc and doc['approver']:
                if 'user_id' in doc['approver']:
                    doc['approver']['user_id'] = str(doc['approver']['user_id'])
                if doc['approver'].get('approved_at'):
                    doc['approver']['approved_at'] = doc['approver']['approved_at'].isoformat()
            
            # Convert history
            if 'history' in doc:
                for entry in doc['history']:
                    if 'user_id' in entry:
                        entry['user_id'] = str(entry['user_id'])
                    if 'timestamp' in entry:
                        entry['timestamp'] = entry['timestamp'].isoformat()
            
            # Convert dates
            if 'created_at' in doc:
                doc['created_at'] = doc['created_at'].isoformat()
            if 'signed_at' in doc:
                doc['signed_at'] = doc['signed_at'].isoformat()
            
            # Convert revisions
            if 'revisions' in doc:
                for rev in doc['revisions']:
                    if 'file_id' in rev:
                        rev['file_id'] = str(rev['file_id'])
                    if 'uploaded_at' in rev:
                        rev['uploaded_at'] = rev['uploaded_at'].isoformat()
        
        return jsonify(unique_docs), 200
        
    except Exception as e:
        print(f"Error in get_my_tasks: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
