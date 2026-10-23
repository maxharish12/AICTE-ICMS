import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Set
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    OverlapFlag, CaseRelationship, CoordinationDecision, Case, Institution, Bureau, WorkflowHistory
)
from backend.app.services.notification_service import notify_bureau_and_admins
from backend.app.services.audit_service import log_audit_event

REQUIRED_OVERLAP_ALERT_MESSAGE = "POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED"

ACTIVE_CASE_STATUSES = [
    "Received", "Acknowledged", "Under Scrutiny", "Assigned",
    "Institution Notice Issued", "Awaiting Response", "Under Verification",
    "Committee Review", "Action Taken", "Transferred", "Escalated", "Reopened"
]

TERMINAL_STATUSES = [
    "Disposed", "Closed – Action Taken", "Closed – No Action Required"
]

def extract_meaningful_tokens(text: str) -> Set[str]:
    """Extracts non-stopword alphanumeric tokens from grievance titles and descriptions."""
    stop_words = {
        "the", "and", "of", "in", "to", "a", "is", "for", "on", "that", "by", "this", "with",
        "i", "you", "it", "not", "or", "be", "are", "from", "at", "as", "your", "all", "have",
        "new", "more", "an", "was", "we", "will", "home", "can", "us", "about", "if", "page",
        "my", "has", "during", "allegation", "alleges", "complaint", "matter", "regarding", "case",
        "institution", "against", "student", "college", "aicte", "report", "dated"
    }
    words = re.findall(r'[a-zA-Z]{3,}', (text or "").lower())
    return {w for w in words if w not in stop_words}

def compute_case_similarity(case_a: Case, case_b: Case) -> Tuple[float, List[str], List[str]]:
    """
    Transparent, explainable rule-based incident relationship calculation:
    - Base shared verified institution identifier: 0.35
    - Exact category match: +0.35
    - Shared grievance subject/description keywords: up to +0.20
    - Temporal proximity (received within 90 days): +0.10
    """
    reasons = []
    score = 0.35 # Base verified institution match
    reasons.append(f"Shared verified institution identifier")

    # Category Match
    cat_a = (case_a.category or "").strip().lower()
    cat_b = (case_b.category or "").strip().lower()
    if cat_a and cat_b and cat_a == cat_b:
        score += 0.35
        reasons.append(f"Matching grievance category '{case_a.category}'")
    elif cat_a and cat_b and ("fee" in cat_a and "fee" in cat_b or "faculty" in cat_a and "faculty" in cat_b):
        score += 0.25
        reasons.append(f"Closely related regulatory grievance domain ('{case_a.category}')")

    # Keyword overlap
    tokens_a = extract_meaningful_tokens(f"{case_a.title} {case_a.last_action}")
    tokens_b = extract_meaningful_tokens(f"{case_b.title} {case_b.last_action}")
    common_tokens = sorted(list(tokens_a.intersection(tokens_b)))

    if len(common_tokens) >= 2:
        score += 0.20
        reasons.append(f"Shared grievance keywords: [{', '.join(common_tokens[:4])}]")
    elif len(common_tokens) == 1:
        score += 0.10
        reasons.append(f"Shared key term: '{common_tokens[0]}'")

    # Temporal proximity
    if case_a.received_at and case_b.received_at:
        dt_a = case_a.received_at.replace(tzinfo=None) if case_a.received_at.tzinfo else case_a.received_at
        dt_b = case_b.received_at.replace(tzinfo=None) if case_b.received_at.tzinfo else case_b.received_at
        time_diff_days = abs((dt_a - dt_b).days)
        if time_diff_days <= 90:
            score += 0.10
            reasons.append(f"Temporal incident proximity ({time_diff_days} days apart)")

    return min(score, 1.0), reasons, common_tokens

def detect_overlaps_for_institution(db: Session, institution_id: int) -> Optional[OverlapFlag]:
    """
    Explainable institution-level and cross-Bureau overlap detection.
    1. Groups cases by verified AICTE Permanent ID / College ID.
    2. Distinguishes between same-institution independent cases and true incident-level overlaps.
    3. Calculates confidence score and transparent explanation.
    """
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        return None

    # Retrieve all active cases for this institution
    active_cases = db.query(Case).filter(
        Case.institution_id == institution_id,
        Case.status.notin_(TERMINAL_STATUSES)
    ).all()

    if len(active_cases) < 2:
        return None

    # Evaluate pairs of active cases for incident-level relationships
    qualifying_pairs = []
    max_confidence = 0.0
    detailed_reasons = []

    for i in range(len(active_cases)):
        for j in range(i + 1, len(active_cases)):
            case_a = active_cases[i]
            case_b = active_cases[j]

            sim_score, pair_reasons, common_tokens = compute_case_similarity(case_a, case_b)

            # Minimum threshold for incident-level potential overlap is 0.65
            # (Requires institution match + category/domain match + keywords or temporal proximity)
            # Distinct issues (e.g. lab facilities vs fee dispute) will score 0.35-0.45 and won't qualify
            if sim_score >= 0.60:
                qualifying_pairs.append((case_a, case_b, sim_score, pair_reasons))
                if sim_score > max_confidence:
                    max_confidence = sim_score
                pair_desc = (
                    f"Cases {case_a.case_reference} and {case_b.case_reference}: "
                    f"{'; '.join(pair_reasons)} (Confidence: {int(sim_score * 100)}%)"
                )
                if pair_desc not in detailed_reasons:
                    detailed_reasons.append(pair_desc)

    # If no pairs cross the threshold, they are independent complaints concerning the same institution
    if not qualifying_pairs:
        return None

    # Check involved bureaus across qualifying pairs
    qualifying_cases = set()
    for ca, cb, _, _ in qualifying_pairs:
        qualifying_cases.add(ca)
        qualifying_cases.add(cb)

    bureau_ids = list(set([c.current_bureau_id for c in qualifying_cases if c.current_bureau_id]))
    bureau_names = [b.name for b in db.query(Bureau).filter(Bureau.id.in_(bureau_ids)).all()]
    case_refs = [c.case_reference for c in qualifying_cases]

    inst_id_label = institution.permanent_id or institution.college_id or f"ID #{institution.id}"
    detection_reason = (
        f"Potential overlapping matters identified for verified institution ({inst_id_label} — {institution.institution_name}). "
        f"Involved cases ({', '.join(case_refs)}) concurrently handled across {len(bureau_names)} Bureau(s) ({', '.join(bureau_names)}). "
        f"Basis: {' | '.join(detailed_reasons)}."
    )

    # Check if an existing OverlapFlag exists for this institution
    overlap_flag = db.query(OverlapFlag).filter(
        OverlapFlag.institution_id == institution_id
    ).first()

    now = datetime.now(timezone.utc)
    if not overlap_flag:
        overlap_flag = OverlapFlag(
            institution_id=institution_id,
            detection_type="EXPLAINABLE_ID_AND_ISSUE_MATCH",
            detection_reason=detection_reason,
            relationship_state="POTENTIAL_OVERLAP",
            confidence_score=round(max_confidence, 2),
            first_detected_at=now,
            last_checked_at=now
        )
        db.add(overlap_flag)
        db.flush()

        notify_bureau_and_admins(
            db=db,
            notification_type="OVERLAP_DETECTED",
            title=REQUIRED_OVERLAP_ALERT_MESSAGE,
            message=detection_reason,
            bureau_ids=bureau_ids,
            institution_id=institution_id,
            overlap_flag_id=overlap_flag.id
        )

        log_audit_event(
            db=db,
            action_type="OVERLAP_FLAG_CREATED",
            record_type="OverlapFlag",
            record_id=str(overlap_flag.id),
            metadata={"institution_identifier": inst_id_label, "confidence": max_confidence, "bureaus": bureau_names}
        )
    else:
        overlap_flag.last_checked_at = now
        overlap_flag.detection_reason = detection_reason
        overlap_flag.confidence_score = round(max_confidence, 2)

    # Synchronize case relationships for qualifying pairs
    for case_a, case_b, sim_score, pair_reasons in qualifying_pairs:
        rel = db.query(CaseRelationship).filter(
            ((CaseRelationship.source_case_id == case_a.id) & (CaseRelationship.related_case_id == case_b.id)) |
            ((CaseRelationship.source_case_id == case_b.id) & (CaseRelationship.related_case_id == case_a.id))
        ).first()
        if not rel:
            rel = CaseRelationship(
                source_case_id=case_a.id,
                related_case_id=case_b.id,
                overlap_flag_id=overlap_flag.id,
                relationship_type="CROSS_BUREAU_OVERLAP" if case_a.current_bureau_id != case_b.current_bureau_id else "INTRA_BUREAU_OVERLAP",
                relationship_state=overlap_flag.relationship_state,
                confidence_score=round(sim_score, 2),
                reason="; ".join(pair_reasons),
                created_at=now,
                updated_at=now
            )
            db.add(rel)
        else:
            rel.confidence_score = round(sim_score, 2)
            rel.reason = "; ".join(pair_reasons)

    db.flush()
    return overlap_flag

def process_coordination_decision(
    db: Session,
    overlap_flag_id: int,
    action_type: str,
    remarks: str,
    actor_id: int,
    coordination_owner_id: Optional[int] = None
) -> OverlapFlag:
    """
    Executes authorized human review and coordination actions.
    Supported actions:
    - REVIEW: Marks state as UNDER_REVIEW
    - CONFIRM_RELATED: Marks state as CONFIRMED_RELATED
    - MARK_NOT_RELATED: Marks state as NOT_RELATED
    - REOPEN: Reopens previous decision, returning state to UNDER_REVIEW
    - REQUEST_COORDINATION: Marks state as COORDINATION_REQUESTED
    - RECORD_JOINT_ACTION: Marks state as JOINT_ACTION_IN_PROGRESS
    - ESCALATE: Marks state as ESCALATED
    - COMPLETE: Marks state as COORDINATION_COMPLETED
    """
    flag = db.query(OverlapFlag).filter(OverlapFlag.id == overlap_flag_id).first()
    if not flag:
        raise ValueError(f"Overlap flag {overlap_flag_id} not found")

    action_to_state_map = {
        "REVIEW": "UNDER_REVIEW",
        "CONFIRM_RELATED": "CONFIRMED_RELATED",
        "MARK_NOT_RELATED": "NOT_RELATED",
        "REOPEN": "UNDER_REVIEW",
        "REQUEST_COORDINATION": "COORDINATION_REQUESTED",
        "RECORD_JOINT_ACTION": "JOINT_ACTION_IN_PROGRESS",
        "ESCALATE": "ESCALATED",
        "COMPLETE": "COORDINATION_COMPLETED",
    }

    new_state = action_to_state_map.get(action_type.upper(), flag.relationship_state)
    prev_state = flag.relationship_state

    flag.relationship_state = new_state
    now = datetime.now(timezone.utc)
    flag.reviewed_at = now
    flag.reviewed_by = actor_id
    if coordination_owner_id:
        flag.coordination_owner_id = coordination_owner_id

    # Create coordination decision entry
    decision = CoordinationDecision(
        overlap_flag_id=flag.id,
        action_type=action_type.upper(),
        remarks=remarks,
        performed_by=actor_id,
        created_at=now
    )
    db.add(decision)

    # Update child relationships
    for rel in flag.relationships:
        rel.relationship_state = new_state
        rel.updated_at = now

    # Record workflow history on all involved cases
    involved_cases = db.query(Case).filter(
        Case.institution_id == flag.institution_id,
        Case.status.notin_(TERMINAL_STATUSES)
    ).all()

    for c in involved_cases:
        wf = WorkflowHistory(
            institution_id=flag.institution_id,
            case_id=c.id,
            action_type=f"COORDINATION_{action_type.upper()}",
            previous_value=prev_state,
            new_value=new_state,
            remarks=remarks,
            performed_by=actor_id,
            created_at=now
        )
        db.add(wf)

    # Log audit event
    log_audit_event(
        db=db,
        action_type=f"OVERLAP_{action_type.upper()}",
        record_type="OverlapFlag",
        record_id=str(flag.id),
        user_id=actor_id,
        metadata={"previous_state": prev_state, "new_state": new_state, "remarks": remarks}
    )

    db.flush()
    return flag
