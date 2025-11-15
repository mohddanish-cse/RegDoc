from flask import Blueprint, jsonify, request
from functools import wraps

ctms_bp = Blueprint('ctms', __name__)

# ========================================
# Mock CTMS Database (simulates external CTMS system)
# ========================================
MOCK_CTMS_STUDIES = [
    {"id": "STUDY-001", "name": "Diabetes Phase III Trial", "sponsor": "PharmaCorp"},
    {"id": "STUDY-002", "name": "Oncology Phase II Study", "sponsor": "BioMed Ltd"},
    {"id": "STUDY-003", "name": "Cardiovascular Research", "sponsor": "HeartCare Inc"},
]

MOCK_CTMS_COUNTRIES = [
    {"code": "US", "name": "United States"},
    {"code": "UK", "name": "United Kingdom"},
    {"code": "IN", "name": "India"},
    {"code": "DE", "name": "Germany"},
    {"code": "JP", "name": "Japan"},
]

MOCK_CTMS_SITES = [
    {"id": "SITE-US-01", "name": "Boston Medical Center", "country": "US", "study_id": "STUDY-001", "status": "Active"},
    {"id": "SITE-US-02", "name": "UCLA Medical", "country": "US", "study_id": "STUDY-001", "status": "Active"},
    {"id": "SITE-UK-01", "name": "London Research Hospital", "country": "UK", "study_id": "STUDY-002", "status": "Active"},
    {"id": "SITE-IN-01", "name": "Mumbai Clinical Trials", "country": "IN", "study_id": "STUDY-001", "status": "Active"},
    {"id": "SITE-DE-01", "name": "Berlin Medical Institute", "country": "DE", "study_id": "STUDY-003", "status": "Active"},
]

# ========================================
# CTMS API Endpoints
# ========================================

@ctms_bp.route('/ctms/studies', methods=['GET'])
def get_ctms_studies():
    """
    Fetch all available studies from CTMS
    GET /api/ctms/studies
    """
    try:
        return jsonify({
            'success': True,
            'data': MOCK_CTMS_STUDIES,
            'count': len(MOCK_CTMS_STUDIES)
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ctms_bp.route('/ctms/countries', methods=['GET'])
def get_ctms_countries():
    """
    Fetch all available countries from CTMS
    GET /api/ctms/countries
    Optional query param: study_id (to filter countries by study)
    """
    try:
        study_id = request.args.get('study_id')
        
        if study_id:
            # Filter sites by study, then get unique countries
            sites_for_study = [s for s in MOCK_CTMS_SITES if s['study_id'] == study_id]
            country_codes = list(set([s['country'] for s in sites_for_study]))
            countries = [c for c in MOCK_CTMS_COUNTRIES if c['code'] in country_codes]
        else:
            countries = MOCK_CTMS_COUNTRIES
        
        return jsonify({
            'success': True,
            'data': countries,
            'count': len(countries)
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ctms_bp.route('/ctms/sites', methods=['GET'])
def get_ctms_sites():
    """
    Fetch all available sites from CTMS
    GET /api/ctms/sites
    Optional query params:
    - study_id: filter by study
    - country: filter by country
    """
    try:
        study_id = request.args.get('study_id')
        country = request.args.get('country')
        
        sites = MOCK_CTMS_SITES
        
        # Apply filters
        if study_id:
            sites = [s for s in sites if s['study_id'] == study_id]
        
        if country:
            sites = [s for s in sites if s['country'] == country]
        
        return jsonify({
            'success': True,
            'data': sites,
            'count': len(sites)
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ctms_bp.route('/ctms/sync', methods=['POST'])
def sync_from_ctms():
    """
    Manual sync endpoint - simulates fetching latest data from CTMS
    POST /api/ctms/sync
    """
    try:
        # In real implementation, this would call actual CTMS API
        # For demo, we just return current mock data
        return jsonify({
            'success': True,
            'message': 'Successfully synced with CTMS',
            'synced_at': '2025-11-15T23:00:00Z',
            'stats': {
                'studies': len(MOCK_CTMS_STUDIES),
                'countries': len(MOCK_CTMS_COUNTRIES),
                'sites': len(MOCK_CTMS_SITES)
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
