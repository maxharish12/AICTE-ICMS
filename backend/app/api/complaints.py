import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.core.permissions import RoleCode, user_has_role
from backend.app.core.config import settings
from backend.app.models.entities import (
    User, Complaint, Institution, ComplaintCategory, Bureau, Document, ComplaintCaseLink, Case, OverlapFlag, WorkflowHistory
)
from backend.app.schemas.all_schemas import (
    ComplaintOut, ComplaintCreate, ComplaintCategoryOut, DocumentOut
)
from backend.app.services.complaint_service import create_complaint
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.get("/categories", response_model=List[ComplaintCategoryOut])
def get_complaint_categories(db: Session = Depends(get_db)):
    return db.query(ComplaintCategory).filter(ComplaintCategory.active == True).all()

def enrich_complaint_out(c: Complaint, can_view_confidential: bool, current_user_id: int) -> ComplaintOut:
    out = ComplaintOut.model_validate(c)
    inst = c.institution
    out.institution_name = inst.institution_name if inst else "N/A"
    out.college_id = inst.college_id if (inst and inst.college_id) else "Not Available"
    out.permanent_id = inst.permanent_id if (inst and inst.permanent_id) else "Not Available"
    out.aicte_permanent_id = inst.permanent_id if (inst and inst.permanent_id) else "Not Available"
    out.category_name = c.category.name if c.category else None
    out.assigned_bureau_name = c.assigned_bureau.name if c.assigned_bureau else None

    if c.case_links and c.case_links[0].case:
        case_obj = c.case_links[0].case
        out.linked_case_reference = case_obj.case_reference
        out.priority = case_obj.priority
    else:
        out.priority = "MEDIUM"

    # Check potential overlaps
    active_overlaps = [
        f for f in (inst.overlap_flags if inst else [])
        if f.relationship_state in ["POTENTIAL_OVERLAP", "UNDER_REVIEW", "COORDINATION_REQUESTED", "CONFIRMED_RELATED", "JOINT_ACTION_IN_PROGRESS", "ESCALATED"]
    ]
    out.has_potential_overlap = len(active_overlaps) > 0
    out.overlap_count = len(active_overlaps)
    if active_overlaps:
        out.overlap_reason = active_overlaps[0].detection_reason
        out.overlap_confidence = active_overlaps[0].confidence_score

    # Mask sensitive details if unauthorized
    if c.sensitivity_classification == "CONFIDENTIAL" and not can_view_confidential and c.complainant_id != current_user_id:
        out.title = "Protected Confidential Complaint [SafeVoice]"
        out.description = "Access restricted to authorized personnel."

    return out

@router.get("", response_model=List[ComplaintOut])
def list_complaints(
    search: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    college_id: Optional[str] = Query(None),
    permanent_id: Optional[str] = Query(None),
    institution_name: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    bureau_id: Optional[int] = Query(None),
    has_overlap: Optional[bool] = Query(None),
    sensitivity: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Complaint)

    # Restrict Complainant to own records
    user_roles = [r.code for r in current_user.roles]
    if RoleCode.COMPLAINANT in user_roles and RoleCode.ADMIN not in user_roles and len(user_roles) == 1:
        query = query.filter(Complaint.complainant_id == current_user.id)

    joined_institution = False
    if college_id and college_id.strip():
        if not joined_institution:
            query = query.join(Complaint.institution)
            joined_institution = True
        query = query.filter(Institution.college_id.ilike(college_id.strip()))

    if permanent_id and permanent_id.strip():
        if not joined_institution:
            query = query.join(Complaint.institution)
            joined_institution = True
        query = query.filter(Institution.permanent_id.ilike(permanent_id.strip()))

    if institution_name and institution_name.strip():
        if not joined_institution:
            query = query.join(Complaint.institution)
            joined_institution = True
        query = query.filter(Institution.institution_name.ilike(f"%{institution_name.strip()}%"))

    if institution_id:
        query = query.filter(Complaint.institution_id == institution_id)
    if category_id:
        query = query.filter(Complaint.category_id == category_id)
    if status and status != "ALL":
        query = query.filter(Complaint.status == status)
    if bureau_id:
        query = query.filter(Complaint.assigned_bureau_id == bureau_id)
    if sensitivity and sensitivity != "ALL":
        query = query.filter(Complaint.sensitivity_classification == sensitivity)

    if priority and priority != "ALL":
        query = query.join(Complaint.case_links).join(ComplaintCaseLink.case).filter(Case.priority == priority.strip().upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        if not joined_institution:
            query = query.join(Complaint.institution)
            joined_institution = True
        query = query.filter(
            or_(
                Complaint.title.ilike(term),
                Complaint.complaint_reference.ilike(term),
                Complaint.description.ilike(term),
                Institution.institution_name.ilike(term),
                Institution.permanent_id.ilike(term),
                Institution.college_id.ilike(term)
            )
        )

    complaints = query.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()

    can_view_confidential = (
        RoleCode.ADMIN in user_roles
        or RoleCode.MANAGEMENT in user_roles
        or RoleCode.BUREAU_HEAD in user_roles
    )

    result = [enrich_complaint_out(c, can_view_confidential, current_user.id) for c in complaints]

    if has_overlap is not None:
        result = [r for r in result if r.has_potential_overlap == has_overlap]

    return result

@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def register_complaint(
    comp_in: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        complaint = create_complaint(db, comp_in, creator_id=current_user.id)
        user_roles = [r.code for r in current_user.roles]
        can_view_confidential = (
            RoleCode.ADMIN in user_roles
            or RoleCode.MANAGEMENT in user_roles
            or RoleCode.BUREAU_HEAD in user_roles
        )
        return enrich_complaint_out(complaint, can_view_confidential, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    user_roles = [r.code for r in current_user.roles]
    can_view_confidential = (
        RoleCode.ADMIN in user_roles
        or RoleCode.MANAGEMENT in user_roles
        or RoleCode.BUREAU_HEAD in user_roles
    )

    if RoleCode.COMPLAINANT in user_roles and RoleCode.ADMIN not in user_roles and len(user_roles) == 1:
        if complaint.complainant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if complaint.sensitivity_classification == "CONFIDENTIAL" and not can_view_confidential and complaint.complainant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Protected SafeVoice confidential complaint.")

    out = enrich_complaint_out(complaint, can_view_confidential, current_user.id)
    out.documents = [DocumentOut.model_validate(d) for d in complaint.documents]
    return out

@router.post("/{complaint_id}/documents", response_model=DocumentOut)
def upload_complaint_document(
    complaint_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    user_roles = [r.code for r in current_user.roles]
    if RoleCode.COMPLAINANT in user_roles and RoleCode.ADMIN not in user_roles and len(user_roles) == 1:
        if complaint.complainant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported file format '{file.content_type}'. Allowed: PDF, JPG, PNG, DOCX.")

    # Sanitize filename
    clean_name = os.path.basename(file.filename or "upload.pdf")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_key = f"doc_{uuid.uuid4().hex[:12]}_{clean_name}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_key)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(file_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to store file: {str(e)}")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum permitted size of {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    doc = Document(
        original_filename=clean_name,
        safe_storage_key=safe_key,
        file_path=file_path,
        content_type=file.content_type,
        file_size=file_size,
        uploaded_by=current_user.id,
        complaint_id=complaint.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_audit_event(
        db=db,
        action_type="DOCUMENT_UPLOADED",
        record_type="Complaint",
        record_id=str(complaint.id),
        user_id=current_user.id,
        metadata={"filename": clean_name, "size": file_size}
    )

    return DocumentOut.model_validate(doc)
