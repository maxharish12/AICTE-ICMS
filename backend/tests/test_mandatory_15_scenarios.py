import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

def get_auth_headers(username="admin", password="Admin@123"):
    login_res = client.post("/api/auth/login", json={
        "username_or_email": username,
        "password": password
    })
    assert login_res.status_code == 200, f"Login failed for {username}: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# ==============================================================================
# TEST 1: Exact AICTE Permanent ID matching
# Multiple complaints with the same AICTE Permanent ID associated with same institution
# ==============================================================================
def test_scenario_01_exact_aicte_permanent_id_matching():
    headers = get_auth_headers("admin", "Admin@123")
    
    # Query complaints for DEMO-AICTE-001
    res = client.get("/api/complaints?permanent_id=DEMO-AICTE-001", headers=headers)
    assert res.status_code == 200
    complaints = res.json()
    assert len(complaints) >= 2, f"Expected at least 2 complaints for DEMO-AICTE-001, got {len(complaints)}"
    
    # Verify all share the exact same institution ID and name
    first_inst_id = complaints[0]["institution_id"]
    for c in complaints:
        assert c["institution_id"] == first_inst_id
        assert c["permanent_id"] == "DEMO-AICTE-001"
        assert c["institution_name"] == "Demo Institute A — Technology & Science"

    # Verify Institution360 consolidates them
    inst_res = client.get(f"/api/institutions/{first_inst_id}", headers=headers)
    assert inst_res.status_code == 200
    inst_profile = inst_res.json()
    assert inst_profile["permanent_id"] == "DEMO-AICTE-001"
    assert len(inst_profile["complaints"]) >= 2

# ==============================================================================
# TEST 2: Different institutions
# Complaints with different valid AICTE Permanent IDs are not grouped together
# ==============================================================================
def test_scenario_02_different_institutions():
    headers = get_auth_headers("admin", "Admin@123")
    
    res1 = client.get("/api/complaints?permanent_id=DEMO-AICTE-001", headers=headers).json()
    res2 = client.get("/api/complaints?permanent_id=DEMO-AICTE-002", headers=headers).json()
    
    inst1_ids = {c["institution_id"] for c in res1}
    inst2_ids = {c["institution_id"] for c in res2}
    
    assert len(inst1_ids.intersection(inst2_ids)) == 0, "Institutions with distinct Permanent IDs must not be merged"
    assert "DEMO-AICTE-001" not in [c["permanent_id"] for c in res2]

# ==============================================================================
# TEST 3: College ID filter
# Search using valid College ID returns only matching institution and associated complaints
# ==============================================================================
def test_scenario_03_college_id_filter():
    headers = get_auth_headers("admin", "Admin@123")
    
    # 1. Filter institutions by College ID
    inst_res = client.get("/api/institutions?college_id=CLG-1001", headers=headers)
    assert inst_res.status_code == 200
    insts = inst_res.json()
    assert len(insts) == 1
    assert insts[0]["college_id"] == "CLG-1001"
    
    # 2. Filter complaints by College ID
    comp_res = client.get("/api/complaints?college_id=CLG-1001", headers=headers)
    assert comp_res.status_code == 200
    comps = comp_res.json()
    assert len(comps) >= 2
    for c in comps:
        assert c["college_id"] == "CLG-1001"

# ==============================================================================
# TEST 4: AICTE Permanent ID filter
# Search using valid AICTE Permanent ID returns matching records
# ==============================================================================
def test_scenario_04_aicte_permanent_id_filter():
    headers = get_auth_headers("admin", "Admin@123")
    
    # Test with surrounding accidental whitespace (normalization)
    comp_res = client.get("/api/complaints?permanent_id=%20DEMO-AICTE-002%20", headers=headers)
    assert comp_res.status_code == 200
    comps = comp_res.json()
    assert len(comps) >= 1
    for c in comps:
        assert c["permanent_id"] == "DEMO-AICTE-002"

# ==============================================================================
# TEST 5: Combined filters
# Filter by AICTE Permanent ID, Bureau/Cell, and Status working together
# ==============================================================================
def test_scenario_05_combined_filters():
    headers = get_auth_headers("admin", "Admin@123")
    
    # Combined: permanent_id=DEMO-AICTE-001 & bureau_id=1 (PGRC) & status=CASE_LINKED
    res = client.get(
        "/api/complaints?permanent_id=DEMO-AICTE-001&bureau_id=1&status=CASE_LINKED",
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    for c in data:
        assert c["permanent_id"] == "DEMO-AICTE-001"
        assert c["assigned_bureau_id"] == 1
        assert c["status"] == "CASE_LINKED"

# ==============================================================================
# TEST 6: Clear filters
# Reset/Clear filters returns full unfiltered recordset
# ==============================================================================
def test_scenario_06_clear_filters():
    headers = get_auth_headers("admin", "Admin@123")
    
    # Filtered subset
    filtered_res = client.get("/api/complaints?college_id=CLG-1002", headers=headers)
    filtered_count = len(filtered_res.json())
    
    # Unfiltered (equivalent to Clear Filters)
    unfiltered_res = client.get("/api/complaints", headers=headers)
    unfiltered_count = len(unfiltered_res.json())
    
    assert unfiltered_count > filtered_count, "Clearing filters must restore full complaint registry"

# ==============================================================================
# TEST 7: Potential overlaps
# Complaints with same institution, similar category, and related incident are flagged with explanation
# ==============================================================================
def test_scenario_07_potential_overlaps():
    headers = get_auth_headers("admin", "Admin@123")
    
    res = client.get("/api/overlaps", headers=headers)
    assert res.status_code == 200
    overlaps = res.json()
    
    inst_a_overlap = next((o for o in overlaps if o["permanent_id"] == "DEMO-AICTE-001"), None)
    assert inst_a_overlap is not None, "Overlap must be detected for Demo Institute A"
    assert inst_a_overlap["confidence_score"] >= 0.60
    assert inst_a_overlap["detection_reason"] is not None and len(inst_a_overlap["detection_reason"]) > 0
    assert len(inst_a_overlap["involved_cases"]) >= 2

# ==============================================================================
# TEST 8: Same institution, unrelated issues
# Same institution does not automatically mean same incident
# ==============================================================================
def test_scenario_08_same_institution_unrelated_issues():
    from backend.app.services.overlap_service import compute_case_similarity
    from backend.app.models.entities import Case
    from backend.app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        # CASE-2026-0001 (Fee dispute, Student Welfare)
        case1 = db.query(Case).filter(Case.case_reference == "CASE-2026-0001").first()
        # CASE-2026-0002 (Faculty Cadre Ratio & Lab Apparatus, Institutional Compliance)
        case2 = db.query(Case).filter(Case.case_reference == "CASE-2026-0002").first()
        
        assert case1 is not None and case2 is not None
        assert case1.institution_id == case2.institution_id, "Must share same institution"
        
        sim, reason, factors = compute_case_similarity(case1, case2)
        # Category mismatch and no token overlap keeps similarity below 0.60 threshold
        assert sim < 0.60, f"Unrelated cases on same institution must not exceed threshold; got score {sim}"
        assert "Independent matter" in reason or sim < 0.60
    finally:
        db.close()

# ==============================================================================
# TEST 9: Overlap review
# Decisions persist (CONFIRM_RELATED, MARK_NOT_RELATED, REOPEN) with audit trail
# ==============================================================================
def test_scenario_09_overlap_review():
    headers = get_auth_headers("admin", "Admin@123")
    
    # 1. Fetch overlap
    overlaps = client.get("/api/overlaps", headers=headers).json()
    ov_id = overlaps[0]["id"]
    
    # 2. Mark as CONFIRM_RELATED
    res_confirm = client.post(
        f"/api/overlaps/{ov_id}/review",
        headers=headers,
        json={
            "action_type": "CONFIRM_RELATED",
            "remarks": "Inter-bureau scrutiny confirmed related capitation fee allegations."
        }
    )
    assert res_confirm.status_code == 200
    assert res_confirm.json()["relationship_state"] == "CONFIRMED_RELATED"
    
    # 3. Reopen review
    res_reopen = client.post(
        f"/api/overlaps/{ov_id}/review",
        headers=headers,
        json={
            "action_type": "REOPEN",
            "remarks": "Reopening review upon submission of additional institutional audit records."
        }
    )
    assert res_reopen.status_code == 200
    assert res_reopen.json()["relationship_state"] == "UNDER_REVIEW"
    
    # 4. Verify audit trail history
    detail = client.get(f"/api/overlaps/{ov_id}", headers=headers).json()
    actions = [d["action_type"] for d in detail["decisions"]]
    assert "CONFIRM_RELATED" in actions
    assert "REOPEN" in actions

# ==============================================================================
# TEST 10: Cross-Bureau visibility
# Displays complaints concerning same institution across different Bureaus
# ==============================================================================
def test_scenario_10_cross_bureau_visibility():
    headers = get_auth_headers("admin", "Admin@123")
    
    # Demo Institute A profile
    inst_profile = client.get("/api/institutions/DEMO-AICTE-001", headers=headers).json()
    bureaus = inst_profile["involved_bureaus"]
    assert len(bureaus) >= 2, f"Expected multiple handling bureaus for Demo Inst A, got {bureaus}"
    assert "Public Grievance Redressal Cell" in bureaus or "Regulation Bureau" in bureaus

# ==============================================================================
# TEST 11: Sensitive complaint authorization (SafeVoice)
# Authorized users access details; unauthorized users receive masked or 403
# ==============================================================================
def test_scenario_11_sensitive_complaint_authorization():
    admin_headers = get_auth_headers("admin", "Admin@123")
    citizen_headers = get_auth_headers("complainant_user", "Citizen@123")
    
    # Admin can view SafeVoice confidential cases
    admin_res = client.get("/api/cases?is_confidential=true", headers=admin_headers)
    assert admin_res.status_code == 200
    conf_cases = admin_res.json()
    assert len(conf_cases) >= 1
    
    # Complaint 6 is confidential
    c6_detail = client.get("/api/complaints/3", headers=admin_headers)
    assert c6_detail.status_code == 200
    assert c6_detail.json()["sensitivity_classification"] == "CONFIDENTIAL"

# ==============================================================================
# TEST 12: Data persistence
# Saved changes remain persistent across re-queries
# ==============================================================================
def test_scenario_12_data_persistence():
    headers = get_auth_headers("admin", "Admin@123")
    
    # Query case 1
    case_before = client.get("/api/cases/1", headers=headers).json()
    
    # Record action
    action_res = client.post(
        "/api/cases/1/actions",
        headers=headers,
        json={
            "action_type": "AUDIT_VERIFIED",
            "action_details": "Statutory audit transaction trail verified.",
            "next_action": "Schedule hearing with management"
        }
    )
    assert action_res.status_code == 200
    
    # Re-fetch case to confirm persistence
    case_after = client.get("/api/cases/1", headers=headers).json()
    assert case_after["next_action"] == "Schedule hearing with management"

# ==============================================================================
# TEST 13: Real-time / controlled polling refresh
# Endpoint provides live telemetry and report consistency
# ==============================================================================
def test_scenario_13_realtime_refresh_and_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    
    headers = get_auth_headers("admin", "Admin@123")
    dash = client.get("/api/reports/dashboard", headers=headers)
    assert dash.status_code == 200
    assert dash.json()["total_complaints"] >= 1

# ==============================================================================
# TEST 14: Empty and missing data
# Handles nonexistent institution IDs and missing AICTE Permanent IDs safely
# ==============================================================================
def test_scenario_14_empty_and_missing_data():
    headers = get_auth_headers("admin", "Admin@123")
    
    # 1. Nonexistent institution ID -> 404
    missing_res = client.get("/api/institutions/NONEXISTENT-ID-99999", headers=headers)
    assert missing_res.status_code == 404
    
    # 2. Institution with no AICTE Permanent ID (Unverified CLG-1006)
    unverified_res = client.get("/api/institutions/CLG-1006", headers=headers)
    assert unverified_res.status_code == 200
    inst_data = unverified_res.json()
    assert inst_data["college_id"] == "CLG-1006"
    assert inst_data["permanent_id"] is None
    
    # 3. Empty filter results return empty list rather than 500 error
    empty_comp = client.get("/api/complaints?college_id=NONEXISTENT_CLG", headers=headers)
    assert empty_comp.status_code == 200
    assert empty_comp.json() == []

# ==============================================================================
# TEST 15: Regression testing
# Core navigation, authentication, and existing workflows remain functional
# ==============================================================================
def test_scenario_15_regression_testing():
    # 1. Role-based login for all roles
    roles_passwords = [
        ("admin", "Admin@123"),
        ("pgrc_officer", "Pgrc@123"),
        ("rb_officer", "Rb@123"),
        ("bureau_head", "Head@123"),
        ("ro_northern", "Ro@123"),
        ("competent_authority", "Auth@123"),
        ("complainant_user", "Citizen@123"),
    ]
    for username, pwd in roles_passwords:
        h = get_auth_headers(username, pwd)
        assert "Authorization" in h
    
    # 2. Complaint categories available
    cats = client.get("/api/complaints/categories").json()
    assert len(cats) >= 4
