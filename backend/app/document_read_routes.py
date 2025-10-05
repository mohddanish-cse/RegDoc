from flask import Blueprint, jsonify, send_file ,request
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
from gridfs.errors import NoFile
from bson.objectid import ObjectId
from bson.errors import InvalidId

document_read_blueprint = Blueprint('document_read', __name__)

fs = None
def init_gridfs():
    global fs
    if fs is None:
        fs = gridfs.GridFS(db)


@document_read_blueprint.route("/", methods=['GET'])
@jwt_required()
def list_documents():
    init_gridfs()
    try:
        user_id_obj = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id_obj})
        if not user: return jsonify({"error": "User not found"}), 404
        user_role = user.get('role')

        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search_query = request.args.get('search', '')
        skip = (page - 1) * limit
        
        # --- NEW, ADVANCED AGGREGATION PIPELINE ---
        pipeline = []

        # Step 1: Initial search filter (if any)
        if search_query:
            pipeline.append({
                '$match': {
                    '$or': [
                        {'filename': {'$regex': search_query, '$options': 'i'}},
                        {'document_number': {'$regex': search_query, '$options': 'i'}}
                    ]
                }
            })

        # Step 2: Sort by version descending to get the latest version first for each document
        pipeline.append({'$sort': {'version': -1}})

        # Step 3: Group by lineage_id to get only the latest version of each document
        pipeline.append({
            '$group': {
                '_id': '$lineage_id',
                'latest_doc': {'$first': '$$ROOT'}
            }
        })

        # Step 4: Promote the latest document to the top level
        pipeline.append({'$replaceRoot': {'newRoot': '$latest_doc'}})

        # Step 5: Exclude archived documents from the main list
        pipeline.append({'$match': {'status': {'$ne': 'Archived'}}})

        # Step 6: Apply security/visibility rules
        if user_role != 'Admin':
            visibility_query = [
                {'status': 'Published'},
                {'author_id': user_id_obj},
                {'reviewers': user_id_obj}
            ]
            pipeline.append({'$match': {'$or': visibility_query}})
        
        # We need a second pipeline for counting without pagination
        count_pipeline = pipeline.copy()
        
        # Step 7: Add sorting, skipping, and limiting for pagination
        pipeline.append({'$sort': {'uploadDate': -1}})
        pipeline.append({'$skip': skip})
        pipeline.append({'$limit': limit})

        # Execute the pipelines
        documents_cursor = db.fs.files.aggregate(pipeline)
        total_documents = len(list(db.fs.files.aggregate(count_pipeline)))

        # Process and return results (this part is unchanged)
        documents_list = []
        for doc in documents_cursor:
            author = db.users.find_one({'_id': doc.get('author_id')})
            processed_doc = {
                'id': str(doc.get('_id')),
                'document_number': doc.get('document_number'),
                'filename': doc.get('filename'),
                'status': doc.get('status'),
                'author_id': str(doc.get('author_id')),
                'author': author.get('username') if author else 'Unknown',
                'reviewers': [str(rid) for rid in doc.get('reviewers', [])]
            }
            documents_list.append(processed_doc)

        return jsonify({
            'documents': documents_list,
            'totalPages': (total_documents + limit - 1) // limit,
            'currentPage': page
        }), 200

    except Exception as e:
        print(f"Error in list_documents: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500  

# --- GET SINGLE DOCUMENT DETAILS ---
# GET /api/documents/<file_id>

@document_read_blueprint.route("/<file_id>", methods=['GET'])
@jwt_required()
def get_document_details(file_id):
    init_gridfs()
    try:
        file_id_obj = ObjectId(file_id)
        file_metadata = db.fs.files.find_one({'_id': file_id_obj})
        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        
        author_id = file_metadata.get('author_id')
        author = db.users.find_one({'_id': author_id})
        
        response_data = {
            "id": str(file_metadata.get('_id')),
            "document_number": file_metadata.get('document_number'),
            "filename": file_metadata.get('filename'),
            "uploadDate": file_metadata.get('uploadDate').isoformat() if file_metadata.get('uploadDate') else None,
            "status": file_metadata.get('status'),
            "version": file_metadata.get('version'),
            "author": author.get('username') if author else 'Unknown',
            "author_id": str(author_id),
            "reviewers": [str(rid) for rid in file_metadata.get('reviewers', [])],
            "lineage_id": str(file_metadata.get('lineage_id'))
        }

        # If the document is signed, add the signature details
        if file_metadata.get('signature'):
            response_data['signature'] = file_metadata.get('signature')
            response_data['signed_at'] = file_metadata.get('signed_at').isoformat()
            
            signer_id = file_metadata.get('signed_by')
            if signer_id:
                signer = db.users.find_one({'_id': signer_id})
                response_data['signed_by_username'] = signer.get('username') if signer else 'Unknown'

        # Process history
        history_list = []
        if 'history' in file_metadata:
            for entry in file_metadata['history']:
                history_user = db.users.find_one({'_id': entry['user_id']})
                history_list.append({
                    "action": entry.get('action'),
                    "user": history_user.get('username') if history_user else 'Unknown',
                    "user_id": str(entry.get('user_id')),
                    "timestamp": entry.get('timestamp').isoformat(),
                    "details": entry.get('details')
                })
        response_data['history'] = history_list
        
        return jsonify(response_data), 200

    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400
    except Exception as e:
        print(f"An error occurred in get_document_details: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- DOWNLOAD A DOCUMENT ---
# GET /api/documents/<file_id>/download

@document_read_blueprint.route("/<file_id>/download", methods=['GET'])
@jwt_required()
def download_document(file_id):
    init_gridfs()

    try:
        # Retrieve the file from GridFS by its ID
        grid_out = fs.get(ObjectId(file_id))
        
        # Use Flask's send_file to stream the file back to the client
        return send_file(
            grid_out,
            mimetype=grid_out.contentType,
            as_attachment=True,
            download_name=grid_out.filename
        )
    except NoFile:
        return jsonify({"error": "File not found"}), 404
    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400

@document_read_blueprint.route("/<file_id>/preview", methods=['GET'])
@jwt_required()
def preview_document(file_id):
    init_gridfs()
    try:
        grid_out = fs.get(ObjectId(file_id))
        
        # The main difference is we don't set 'as_attachment=True'
        return send_file(
            grid_out,
            mimetype=grid_out.contentType,
            download_name=grid_out.filename
        )
    except NoFile:
        return jsonify({"error": "File not found"}), 404
    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400

@document_read_blueprint.route("/my-tasks", methods=['GET'])
@jwt_required()
def get_my_tasks():
    init_gridfs()
    try:
        user_id_obj = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id_obj})

        if not user:
            return jsonify({"error": "User not found"}), 404

        user_role = user.get('role')
        
        # This query now ONLY looks for documents awaiting review or approval
        query = {"$or": []}

        # Task 1: If you are a REVIEWER, your task is to act on 'In Review' documents.
        if user_role in ['Reviewer', 'Admin']:
            query["$or"].append({
                "reviewers": user_id_obj, 
                "status": "In Review"
            })
            
        # Task 2: If you are an APPROVER (or Admin), your task is to act on 'Review Complete' documents.
        if user_role in ['Approver', 'Admin']:
            query["$or"].append({
                "status": "Review Complete"
            })

        # If the user has no review/approval tasks, return an empty list
        if not query["$or"]:
            return jsonify([])

        documents_cursor = db.fs.files.find(query).sort('uploadDate', -1)
        
        final_tasks = []
        for doc in documents_cursor:
            # Smart Filtering: If it's 'In Review', make sure this user hasn't already acted.
            if doc.get('status') == 'In Review' and user_role in ['Reviewer', 'Admin']:
                history = doc.get('history', [])
                already_reviewed = any(
                    entry.get('user_id') == user_id_obj and str(entry.get('action', '')).startswith('Review')
                    for entry in history
                )
                if already_reviewed:
                    continue # Skip this task, it's done.

            # Process and add the document to the final list
            author = db.users.find_one({'_id': doc.get('author_id')})
            processed_doc = {
                'id': str(doc.get('_id')),
                'document_number': doc.get('document_number'),
                'filename': doc.get('filename'),
                'status': doc.get('status'),
                'author_id': str(doc.get('author_id')),
                'author': author.get('username') if author else 'Unknown',
                'reviewers': [str(rid) for rid in doc.get('reviewers', [])]
            }
            final_tasks.append(processed_doc)

        return jsonify(final_tasks), 200

    except Exception as e:
        print(f"Error in get_my_tasks: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@document_read_blueprint.route("/lineage/<lineage_id>", methods=['GET'])
@jwt_required()
def get_document_lineage(lineage_id):
    init_gridfs()
    try:
        lineage_id_obj = ObjectId(lineage_id)

        # Find all documents that share the same lineage_id
        # Sort by version string descending to show newest first
        lineage_cursor = db.fs.files.find(
            {'lineage_id': lineage_id_obj}
        ).sort('version', -1)

        version_history = []
        for doc in lineage_cursor:
            version_history.append({
                'id': str(doc['_id']),
                'version': doc.get('version'),
                'status': doc.get('status'),
                'uploadDate': doc.get('uploadDate').isoformat() if doc.get('uploadDate') else None
            })

        return jsonify(version_history), 200

    except InvalidId:
        return jsonify({"error": "Invalid lineage ID format"}), 400
    except Exception as e:
        print(f"Error in get_document_lineage: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500
    
    