import datetime
from flask import Blueprint, request, jsonify
from . import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import gridfs
from bson.objectid import ObjectId

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

# Add this import to the top of the file
from gridfs.errors import NoFile
from flask import send_file
from bson.errors import InvalidId

# ... (existing code for blueprint and upload/list routes) ...


# --- NEW: GET SINGLE DOCUMENT DETAILS ---
@document_blueprint.route("/<file_id>", methods=['GET'])
@jwt_required()
def get_document_details(file_id):
    init_gridfs()
    
    try:
        # Use an aggregation pipeline to get details and author info
        pipeline = [
            {
                '$match': {'_id': ObjectId(file_id)} # Filter by the specific file ID
            },
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
                    '_id': 0,
                    'id': {'$toString': '$_id'},
                    'filename': '$filename',
                    'contentType': '$contentType',
                    'uploadDate': '$uploadDate',
                    'status': '$status',
                    'version': '$version',
                    'author': '$author_info.username',
                    'history': '$history' # Include history for the audit trail
                }
            }
        ]
        
        document = list(db.fs.files.aggregate(pipeline))

        if not document:
            return jsonify({"error": "File not found"}), 404
            
        return jsonify(document[0]), 200

    except InvalidId:
        return jsonify({"error": "Invalid file ID format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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