# backend/app/workflow_template_routes.py

from flask import Blueprint, jsonify
from . import db
from flask_jwt_extended import jwt_required

template_bp = Blueprint('workflow_templates', __name__)

@template_bp.route('/api/workflow-templates', methods=['GET'])
@jwt_required()
def get_workflow_templates():
    """Fetches all available workflow templates."""
    try:
        templates = list(db.workflow_templates.find({}))
        # The frontend expects the id to be a string named 'id'
        for t in templates:
            t['id'] = str(t['_id'])
            del t['_id']
        return jsonify(templates), 200
    except Exception as e:
        print(f"Error in get_workflow_templates: {e}")
        return jsonify(error="An internal server error occurred"), 500