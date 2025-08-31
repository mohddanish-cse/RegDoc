from flask import Blueprint, jsonify, send_file
from . import db
from flask_jwt_extended import jwt_required
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

# GET /api/documents/
@document_read_blueprint.route("/", methods=['GET'])
@jwt_required()
def list_documents():
    init_gridfs()

    try:
        documents_list = []
        # 1. Fetch all file metadata, sorted by date
        for doc in db.fs.files.find({}).sort('uploadDate', -1):
            
            # 2. For each document, safely fetch the author's details
            author = None
            if doc.get('author_id'):
                author = db.users.find_one({'_id': doc.get('author_id')})

            # 3. Manually and safely build the response object for each document
            processed_doc = {
                'id': str(doc.get('_id')),
                'filename': doc.get('filename'),
                'contentType': doc.get('contentType'),
                'uploadDate': doc.get('uploadDate').isoformat() if doc.get('uploadDate') else None,
                'status': doc.get('status'),
                'version': doc.get('version'),
                'author_id': str(doc.get('author_id')),
                'author': author.get('username') if author else 'Unknown',
                'reviewers': [str(rid) for rid in doc.get('reviewers', [])]
            }
            documents_list.append(processed_doc)

        return jsonify(documents_list), 200

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

        # Step 1: Find the file's metadata
        file_metadata = db.fs.files.find_one({'_id': file_id_obj})

        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        
        # Step 2: Find the author's details separately
        author_id = file_metadata.get('author_id')
        author = db.users.find_one({'_id': author_id})
        
        # Step 3: Manually build the JSON-safe response
        response_data = {
            "id": str(file_metadata['_id']),
            "filename": file_metadata.get('filename'),
            "contentType": file_metadata.get('contentType'),
            "uploadDate": file_metadata.get('uploadDate').isoformat(),
            "status": file_metadata.get('status'),
            "version": file_metadata.get('version'),
            "author": author.get('username') if author else 'Unknown',
            "author_id": str(author_id)
        }

        # Step 4: Safely process the history array
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
