# backend/routes/integration_routes.py

import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson.objectid import ObjectId

integration_blueprint = Blueprint('integration', __name__)

# TMF Zone to System Mapping
ZONE_SYSTEM_MAPPING = {
    "01": ["RIMS"],
    "02": ["RIMS", "Site Portal", "EDC", "Safety DB"],
    "03": ["RIMS", "Site Portal"],
    "04": ["IRT", "Site Portal"],
    "05": ["Safety DB", "Site Portal", "EDC", "RIMS"],
    "06": ["Site Portal"],
    "07": ["EDC", "Site Portal"],
    "08": ["IRT", "RIMS", "Site Portal"],
    "09": ["EDC", "Safety DB"],
    "10": ["RIMS"],
    "11": ["Site Portal"],
}

CTMS_ALWAYS = "CTMS"


def get_db():
    """Import db only when needed to avoid circular imports"""
    from app import db
    return db


@integration_blueprint.route('/available-systems/<doc_id>', methods=['GET'])
@jwt_required()
def get_available_systems(doc_id):
    """Get list of systems available for integration based on TMF zone"""
    try:
        db = get_db()
        
        # Convert string ID to ObjectId
        try:
            doc_object_id = ObjectId(doc_id)
        except:
            return jsonify({"error": "Invalid document ID format"}), 400
        
        doc = db.documents.find_one({'_id': doc_object_id})
        
        if not doc:
            return jsonify({"error": "Document not found"}), 404
        
        if doc.get('status') != 'Approved':
            return jsonify({"error": "Only approved documents can be integrated"}), 400
        
        # Extract zone from tmf_zone
        tmf_zone = doc.get('tmf_metadata', {}).get('tmf_zone', '')
        
        # Try multiple extraction methods
        zone_code = None
        if ' - ' in tmf_zone:
            # Format: "02 - Central Trial Documents"
            zone_code = tmf_zone.split(' - ')[0].strip()
        elif '.' in tmf_zone:
            # Format: "02.01" 
            zone_code = tmf_zone.split('.')[0].strip()
        else:
            # Direct format: "02"
            zone_code = tmf_zone.strip()
        
        # Ensure it's 2 digits
        if zone_code and zone_code.isdigit():
            if len(zone_code) == 1:
                zone_code = "0" + zone_code
        else:
            zone_code = None
        
        print(f"DEBUG: tmf_zone='{tmf_zone}', extracted zone_code='{zone_code}'")
        
        # Start with CTMS (always available)
        systems = [CTMS_ALWAYS]
        
        # Add zone-specific systems
        if zone_code and zone_code in ZONE_SYSTEM_MAPPING:
            systems.extend(ZONE_SYSTEM_MAPPING[zone_code])
        
        return jsonify({
            "document_id": str(doc['_id']),
            "doc_number": doc.get('doc_number'),
            "version": f"{doc.get('major_version', 1)}.{doc.get('minor_version', 0)}",
            "tmf_zone": tmf_zone,
            "available_systems": systems
        }), 200
    
    except Exception as e:
        print(f"ERROR in get_available_systems: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@integration_blueprint.route('/push', methods=['POST'])
@jwt_required()
def push_to_system():
    """Push approved document to external system"""
    try:
        db = get_db()
        
        user_id = ObjectId(get_jwt_identity())
        user = db.users.find_one({'_id': user_id})
        
        data = request.json
        doc_id = data.get('document_id')
        target_system = data.get('target_system')
        
        if not doc_id or not target_system:
            return jsonify({"error": "document_id and target_system required"}), 400
        
        # Convert string ID to ObjectId
        try:
            doc_object_id = ObjectId(doc_id)
        except:
            return jsonify({"error": "Invalid document ID format"}), 400
        
        doc = db.documents.find_one({'_id': doc_object_id})
        
        if not doc:
            return jsonify({"error": "Document not found"}), 404
        
        if doc.get('status') != 'Approved':
            return jsonify({"error": "Only approved documents can be pushed"}), 400
        
        # Create integration log entry
        integration_log = {
            "document_id": str(doc['_id']),
            "doc_number": doc.get('doc_number'),
            "version": f"{doc.get('major_version', 1)}.{doc.get('minor_version', 0)}",
            "target_system": target_system,
            "pushed_by_id": user_id,
            "pushed_by_username": user['username'],
            "pushed_at": datetime.datetime.now(datetime.timezone.utc),
            "status": "success",
            "method": "push"
        }
        
        db.integration_log.insert_one(integration_log)
        
        return jsonify({
            "message": f"Document successfully sent to {target_system}",
            "document_id": str(doc['_id']),
            "target_system": target_system
        }), 200
    
    except Exception as e:
        print(f"ERROR in push_to_system: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@integration_blueprint.route('/approved-documents', methods=['GET'])
def get_approved_documents():
    """Get list of approved documents (external systems can query this)"""
    db = get_db()
    
    zone = request.args.get('zone')
    after_date = request.args.get('after_date')
    
    query = {"status": "Approved"}
    
    if zone:
        query['tmf_metadata.tmf_zone'] = {'$regex': f'^{zone}'}
    
    if after_date:
        query['signed_at'] = {'$gte': after_date}
    
    docs = list(db.documents.find(query, {
        "_id": 0,
        "doc_number": 1,
        "major_version": 1,
        "minor_version": 1,
        "tmf_metadata": 1,
        "signed_at": 1,
        "signed_by_username": 1,
        "revisions": 1
    }).limit(100))
    
    return jsonify({
        "total": len(docs),
        "documents": docs
    }), 200


@integration_blueprint.route('/logs', methods=['GET'])
@jwt_required()
def get_integration_logs():
    """Get integration logs for audit trail"""
    db = get_db()
    
    doc_id = request.args.get('document_id')
    
    query = {}
    if doc_id:
        query['document_id'] = doc_id
    
    logs = list(db.integration_log.find(
        query, 
        {"_id": 0}
    ).sort("pushed_at", -1).limit(50))
    
    return jsonify({
        "total": len(logs),
        "logs": logs
    }), 200
