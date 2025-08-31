import datetime
from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
from bson.objectid import ObjectId

from gridfs.errors import NoFile
from flask import send_file
from bson.errors import InvalidId

# Create a Blueprint for document routes
document_blueprint = Blueprint('documents', __name__)

# We will initialize GridFS when it's first needed
fs = None

# Helper function to initialize GridFS
def init_gridfs():
    global fs
    if fs is None:
        fs = gridfs.GridFS(db)

@document_blueprint.route("/upload", methods=['POST'])
@jwt_required()
def upload_document():
    init_gridfs() # Ensure GridFS is initialized

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file:
        user_id = get_jwt_identity()
        
        # Save the file to GridFS with metadata
        file_id = fs.put(
            file, 
            filename=file.filename, 
            contentType=file.content_type,
            author_id=ObjectId(user_id),
            status='Draft',
            version='0.1',
            history=[] # To build the audit trail later
        )
        
        return jsonify({
            "message": "File uploaded successfully",
            "file_id": str(file_id)
        }), 201

    return jsonify({"error": "An unexpected error occurred"}), 500

@document_blueprint.route("/", methods=['GET'])
@jwt_required()
def list_documents():
    init_gridfs()

    # This pipeline joins fs.files with the users collection to get author details
    pipeline = [
        {
            '$lookup': {
                'from': 'users',
                'localField': 'author_id',
                'foreignField': '_id',
                'as': 'author_info'
            }
        },
        {
            '$unwind': '$author_info'
        },
        {
            '$project': {
                '_id': 0, # Exclude the original _id
                'id': {'$toString': '$_id'}, # Convert _id to string as 'id'
                'filename': '$filename',
                'contentType': '$contentType',
                'uploadDate': '$uploadDate',
                'status': '$status',
                'version': '$version',
                'author': '$author_info.username'
            }
        },
        {
            '$sort': {
                'uploadDate': -1 # Sort by most recent first
            }
        }
    ]

    try:
        documents = list(db.fs.files.aggregate(pipeline))
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- GET SINGLE DOCUMENT DETAILS ---
@document_blueprint.route("/<file_id>", methods=['GET'])
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
@document_blueprint.route("/<file_id>/download", methods=['GET'])
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
    
@document_blueprint.route("/<file_id>/submit", methods=['POST'])
@jwt_required()
def submit_document(file_id):
    init_gridfs()
    
    try:
        file_id_obj = ObjectId(file_id)
        user_id = get_jwt_identity()

        # Find the document's metadata in fs.files
        file_metadata = db.fs.files.find_one({'_id': file_id_obj})

        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        
        # --- Authorization Check ---
        # Ensure the person submitting is the original author
        if str(file_metadata['author_id']) != user_id:
            return jsonify({"error": "Forbidden: You are not the author of this document"}), 403

        # --- State Machine Check ---
        # Ensure the document is in 'Draft' status before submitting
        if file_metadata['status'] != 'Draft':
            return jsonify({"error": f"Document is already in '{file_metadata['status']}' status and cannot be submitted."}), 400

        # --- Create the Audit Log Entry ---
        history_entry = {
            "action": "Submitted for Review",
            "user_id": ObjectId(user_id),
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "details": "Document submitted by author."
        }

        # --- Update the Document ---
        db.fs.files.update_one(
            {'_id': file_id_obj},
            {
                '$set': {'status': 'In Review'},
                '$push': {'history': history_entry}
            }
        )

        return jsonify({"message": "Document submitted for review successfully"}), 200

    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500