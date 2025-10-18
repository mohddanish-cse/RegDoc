# backend/app/document_read_routes.py

from flask import Blueprint, jsonify, send_file, request
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
from gridfs.errors import NoFile
from bson.objectid import ObjectId
from bson.errors import InvalidId

document_read_blueprint = Blueprint('document_read', __name__)
fs = gridfs.GridFS(db)

@document_read_blueprint.route("/", methods=['GET'])
@jwt_required()
def list_documents():
    try:
        user_id_obj = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id_obj})
        if not user: return jsonify({"error": "User not found"}), 404
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search_query = request.args.get('search', '')
        skip = (page - 1) * limit
        
        query = {}
        if search_query:
            query['$or'] = [
                {'revisions.filename': {'$regex': search_query, '$options': 'i'}},
                {'doc_number': {'$regex': search_query, '$options': 'i'}}
            ]
        
        pipeline = [
            {'$sort': {'major_version': -1}},
            {'$group': {'_id': '$lineage_id', 'latest_doc': {'$first': '$$ROOT'}}},
            {'$replaceRoot': {'newRoot': '$latest_doc'}},
            {'$match': query},
            {'$sort': {'created_at': -1}}
        ]

        total_documents = len(list(db.documents.aggregate(pipeline)))
        paginated_pipeline = pipeline + [{'$skip': skip}, {'$limit': limit}]
        documents_cursor = db.documents.aggregate(paginated_pipeline)
        
        documents_list = []
        for doc in documents_cursor:
            active_rev = doc.get('revisions', [])[doc.get('active_revision', 0)]
            documents_list.append({
                'id': str(doc.get('_id')),
                # --- FIX: Changed 'doc_number' back to 'document_number' to match frontend ---
                'document_number': doc.get('doc_number'),
                'filename': active_rev.get('filename'),
                'status': doc.get('status'),
                'author': doc.get('author_username', 'Unknown')
            })

        return jsonify({
            'documents': documents_list,
            'totalPages': (total_documents + limit - 1) // limit,
            'currentPage': page
        }), 200
    except Exception as e:
        print(f"Error in list_documents: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@document_read_blueprint.route("/<doc_id>", methods=['GET'])
@jwt_required()
def get_document_details(doc_id):
    try:
        doc_id_obj = ObjectId(doc_id)
        doc_metadata = db.documents.find_one({'_id': doc_id_obj})
        if not doc_metadata:
            return jsonify({"error": "Document not found"}), 404
        
        active_rev = doc_metadata.get('revisions', [])[doc_metadata.get('active_revision', 0)]

        response_data = {
            "id": str(doc_metadata.get('_id')),
            "document_number": doc_metadata.get('doc_number'),
            "filename": active_rev.get('filename'),
            "uploadDate": doc_metadata.get('created_at').isoformat(),
            "status": doc_metadata.get('status'),
            "version": f"{doc_metadata.get('major_version')}.{doc_metadata.get('minor_version')}",
            "author": doc_metadata.get('author_username', 'Unknown'),
            "author_id": str(doc_metadata.get('author_id')),
            "lineage_id": doc_metadata.get('lineage_id')
        }
        
        # --- THE FIX IS HERE ---
        # If the document has a signature, add the signature details to the response.
        if 'signature' in doc_metadata:
            response_data['signature'] = doc_metadata.get('signature')
            response_data['signed_at'] = doc_metadata.get('signed_at').isoformat()
            response_data['signed_by_username'] = doc_metadata.get('signed_by_username', 'Unknown')

        # Process history (This part is unchanged)
        history_list = []
        for entry in doc_metadata.get('history', []):
            history_list.append({
                "action": entry.get('action'),
                "user": entry.get('user_username', 'Unknown'),
                "timestamp": entry.get('timestamp').isoformat(),
                "details": entry.get('details')
            })
        response_data['history'] = history_list

        return jsonify(response_data), 200
    except InvalidId:
        return jsonify({"error": "Invalid document ID format"}), 400
    except Exception as e:
        print(f"An error occurred in get_document_details: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500
    
@document_read_blueprint.route("/<doc_id>/preview", methods=['GET'])
@jwt_required()
def preview_document(doc_id):
    # This route remains the same, but the logic is now fully correct in context.
    try:
        doc_metadata = db.documents.find_one({'_id': ObjectId(doc_id)})
        if not doc_metadata:
            return jsonify({"error": "Document metadata not found"}), 404
        
        active_rev = doc_metadata.get('revisions', [])[doc_metadata.get('active_revision', 0)]
        file_id_obj = active_rev.get('file_id')

        grid_out = fs.get(file_id_obj)
        return send_file(
            grid_out,
            mimetype=grid_out.contentType,
            download_name=grid_out.filename
        )
    except NoFile:
        return jsonify({"error": "File data not found in GridFS"}), 404
    except (InvalidId, IndexError):
        return jsonify({"error": "Invalid ID format or revision not found"}), 400


@document_read_blueprint.route("/my-tasks", methods=['GET'])
@jwt_required()
def get_my_tasks():
    try:
        user_id_obj = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id_obj})
        if not user:
            return jsonify(error="User not found"), 404

        # --- NEW, MORE POWERFUL QUERY ---
        # This query now finds any document where the user is an active, pending reviewer
        # in the document's currently active stage.
        pipeline = [
            # Match documents that are in an active workflow state
            {'$match': {'status': {'$in': ['In QC', 'In Review', 'Review Complete']}}},
            # Unwind the workflow array to look at each stage individually
            {'$unwind': '$workflow'},
            # Match the stage that is the current active stage
            {'$match': {'$expr': {'$eq': ['$workflow.stage_number', '$current_stage']}}},
            # Unwind the reviewers array to look at each reviewer
            {'$unwind': '$workflow.reviewers'},
            # Find the specific task for the current user that is still pending
            {'$match': {
                'workflow.reviewers.user_id': user_id_obj,
                'workflow.reviewers.status': 'Pending'
            }},
            # Re-group the document to its original shape if needed (optional but clean)
            {'$group': {'_id': '$_id', 'doc': {'$first': '$$ROOT'}}},
            {'$replaceRoot': {'newRoot': '$doc'}}
        ]

        documents_cursor = db.documents.aggregate(pipeline)
        
        tasks_list = []
        for doc in documents_cursor:
            active_rev = doc.get('revisions', [])[doc.get('active_revision', 0)]
            tasks_list.append({
                'id': str(doc.get('_id')),
                'document_number': doc.get('doc_number'),
                'filename': active_rev.get('filename'),
                'status': doc.get('status'),
                'author': doc.get('author_username', 'Unknown')
            })
        return jsonify(tasks_list), 200
        
    except Exception as e:
        print(f"Error in get_my_tasks: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@document_read_blueprint.route("/lineage/<lineage_id>", methods=['GET'])
@jwt_required()
def get_document_lineage(lineage_id):
    try:
        lineage_cursor = db.documents.find({'lineage_id': lineage_id}).sort('major_version', -1)
        version_history = []
        for doc in lineage_cursor:
            version_history.append({
                'id': str(doc['_id']),
                'version': f"{doc.get('major_version')}.{doc.get('minor_version')}",
                'status': doc.get('status'),
                'uploadDate': doc.get('created_at').isoformat()
            })
        return jsonify(version_history), 200
    except Exception as e:
        print(f"Error in get_document_lineage: {e}")
        return jsonify({"error": "AnF internal server error occurred"}), 500