from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import select, or_, func
from pydantic import BaseModel
from typing import Optional, List, Any
import random, string
from datetime import datetime

from app.core.database import get_db
from app.deps import get_current_active_user, require_permission, get_own_lab_department
from app.services.notification_service import notify_user_or_role
from app.models.user import User
from app.models.lab import LabTestMaster, SampleCollection, SampleProcessing, LabResult, LabReport, LabActivity

router = APIRouter(prefix="/lab", tags=["Lab"])
_auth = Depends(get_current_active_user)
_perm_create = Depends(require_permission("Lab & Diagnostics", "Create"))
_perm_edit = Depends(require_permission("Lab & Diagnostics", "Edit"))
_perm_delete = Depends(require_permission("Lab & Diagnostics", "Delete"))


def _lab_branch_filter(stmt, model, current_user: User, branch: str | None = None):
    """Apply strict branch scoping: super_admin/admin see all (or specified branch query);
    all other roles (including lab technicians) ONLY see lab records belonging to their assigned branch.
    Lab tests assigned in one branch will NOT be visible to lab technicians of other branches."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")
    target = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
    if target and target.lower() != "all":
        norm_sub = target.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
        clauses = [
            func.lower(model.branch) == target.lower(),
        ]
        if norm_sub:
            clauses.append(func.lower(model.branch).contains(norm_sub))
        # If the target branch IS specifically 'Main Branch', allow NULL/empty or 'Main Branch'
        if norm_sub == "main" or target.lower() == "main branch":
            clauses.extend([
                model.branch.is_(None),
                model.branch == "",
                func.lower(model.branch) == "main branch",
                func.lower(model.branch).contains("main branch"),
            ])
        stmt = stmt.where(or_(*clauses))
    return stmt



# ── Pydantic schemas ──────────────────────────────────────────

class TestMasterIn(BaseModel):
    testCode: str
    testName: str
    department: str
    category: str
    subCategory: str
    sampleType: str
    containerType: str
    method: str
    machine: str
    normalRange: str
    criticalRange: str
    unit: str
    tatHours: int = 2
    price: float = 0.0
    status: str = "Active"
    prepInstructions: Optional[str] = None
    reportTemplate: Optional[str] = None
    remarks: Optional[str] = None

class SampleCollectionIn(BaseModel):
    patientUhid: str
    patientName: str
    age: int
    gender: str
    doctorName: str
    department: str
    orderedTests: List[str]
    sampleType: str
    container: str
    barcode: str
    collectionDate: str
    collectionTime: str
    collectedBy: str
    priority: str = "Normal"
    status: str = "Pending"
    remarks: Optional[str] = None
    erEncounterId: Optional[str] = None
    isEmergency: bool = False
    branch: Optional[str] = None

class SampleStatusUpdate(BaseModel):
    status: str
    technician: Optional[str] = None
    remarks: Optional[str] = None

class ProcessingStatusUpdate(BaseModel):
    status: str
    technician: Optional[str] = None

class LabResultIn(BaseModel):
    patientName: str
    patientUhid: str
    testName: str
    testCode: str
    sampleId: str
    resultValue: str
    unit: str
    referenceRange: str
    flag: str = "Normal"
    technician: str
    verifiedBy: str = "Pending"
    entryDate: str
    status: str = "Pending"
    notes: Optional[str] = None
    branch: Optional[str] = None

class LabResultUpdate(BaseModel):
    resultValue: Optional[str] = None
    flag: Optional[str] = None
    status: Optional[str] = None
    verifiedBy: Optional[str] = None
    notes: Optional[str] = None

class ReportStatusUpdate(BaseModel):
    status: str

class DoctorReviewIn(BaseModel):
    reviewStatus: str
    comments: Optional[str] = None

class OPDOrderIn(BaseModel):
    patientName: str
    patientUhid: str
    age: int
    gender: str
    doctorName: str
    department: str
    tests: List[str]
    branch: Optional[str] = None
    erEncounterId: Optional[str] = None
    isEmergency: bool = False

class ActivityIn(BaseModel):
    type: str
    title: str
    user: str
    priority: str = "Normal"


def _row_to_dict(row) -> dict:
    """Convert SQLAlchemy model to camelCase dict for frontend."""
    d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
    return d


def _test_names_in_department(db: Session, department: str) -> set[str]:
    """Resolve the set of LabTestMaster.test_name values belonging to a given
    test-catalog department/section (see get_own_lab_department() in deps.py
    for the department-vs-department distinction this depends on).

    SampleCollection.ordered_tests / LabReport.tests store test *names* as a
    JSON string list, not test_code/test_id FKs (confirmed by reading
    SampleCollectionIn/orderedTests and LabContext.tsx) — so this can't be
    pushed down as a SQL join. Doing it as a single lookup query + in-Python
    set membership check instead, which is fine at this app's data volumes
    and avoids assuming a stronger link (FK) than actually exists in the
    schema.
    """
    rows = db.scalars(
        select(LabTestMaster.test_name).where(LabTestMaster.department == department)
    ).all()
    return set(rows)


def _camel(row) -> dict:
    """Map snake_case DB columns to camelCase for frontend."""
    d = _row_to_dict(row)
    mapping = {
        "test_code": "testCode", "test_name": "testName", "sub_category": "subCategory",
        "sample_type": "sampleType", "container_type": "containerType", "normal_range": "normalRange",
        "critical_range": "criticalRange", "tat_hours": "tatHours", "prep_instructions": "prepInstructions",
        "report_template": "reportTemplate", "collection_id": "collectionId", "patient_uhid": "patientUhid",
        "patient_name": "patientName", "doctor_name": "doctorName", "ordered_tests": "orderedTests",
        "collection_date": "collectionDate", "collection_time": "collectionTime", "collected_by": "collectedBy",
        "sample_id": "sampleId", "assigned_technician": "assignedTechnician", "processing_start": "processingStart",
        "processing_end": "processingEnd", "qc_status": "qcStatus", "result_value": "resultValue",
        "reference_range": "referenceRange", "verified_by": "verifiedBy", "entry_date": "entryDate",
        "report_number": "reportNumber", "patient_age": "patientAge", "patient_gender": "patientGender",
        "test_results": "testResults", "generated_date": "generatedDate", "generated_by": "generatedBy",
        "doctor_review_status": "doctorReviewStatus", "doctor_comments": "doctorComments",
        "doctor_review_date": "doctorReviewDate", "er_encounter_id": "erEncounterId", "is_emergency": "isEmergency",
        "created_at": "createdAt", "updated_at": "updatedAt",
    }
    result = {}
    for k, v in d.items():
        result[mapping.get(k, k)] = v
    return result


# ── Test Master ───────────────────────────────────────────────

@router.get("/test-master")
def list_test_master(db: Session = Depends(get_db), _=_auth):
    rows = db.scalars(select(LabTestMaster).order_by(LabTestMaster.created_at.desc())).all()
    return [_camel(r) for r in rows]


@router.post("/test-master", status_code=201)
def create_test_master(payload: TestMasterIn, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    existing = db.scalar(select(LabTestMaster).where(LabTestMaster.test_code == payload.testCode))
    if existing:
        raise HTTPException(400, "Test code already exists")
    row = LabTestMaster(
        test_code=payload.testCode, test_name=payload.testName, department=payload.department,
        category=payload.category, sub_category=payload.subCategory, sample_type=payload.sampleType,
        container_type=payload.containerType, method=payload.method, machine=payload.machine,
        normal_range=payload.normalRange, critical_range=payload.criticalRange, unit=payload.unit,
        tat_hours=payload.tatHours, price=payload.price, status=payload.status,
        prep_instructions=payload.prepInstructions, report_template=payload.reportTemplate,
        remarks=payload.remarks,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


@router.put("/test-master/{item_id}")
def update_test_master(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_edit):
    row = db.get(LabTestMaster, item_id)
    if not row:
        raise HTTPException(404, "Test not found")
    field_map = {
        "testCode": "test_code", "testName": "test_name", "subCategory": "sub_category",
        "sampleType": "sample_type", "containerType": "container_type", "normalRange": "normal_range",
        "criticalRange": "critical_range", "tatHours": "tat_hours", "prepInstructions": "prep_instructions",
        "reportTemplate": "report_template",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(row, col):
            setattr(row, col, v)
    db.commit(); db.refresh(row)
    return _camel(row)


@router.delete("/test-master/{item_id}", status_code=204)
def delete_test_master(item_id: str, db: Session = Depends(get_db), _=_auth, _perm=_perm_delete):
    row = db.get(LabTestMaster, item_id)
    if row:
        db.delete(row); db.commit()


# ── Sample Collections ────────────────────────────────────────
# Lab-department scoping (see CHANGELOG.md Phase 14, deps.py::get_own_lab_department):
# "department" for a lab tech means their test-catalog section (matches
# LabTestMaster.department), NOT the ordering-clinical-department value
# stored in SampleCollection.department itself — those are two different
# things that happen to share a column name. A tech only sees samples that
# include at least one test from their own section; samples with tests
# spanning multiple sections are visible to every section involved, which is
# the correct behavior for a central lab (the sample physically has to go to
# each relevant section regardless of who logged it).

@router.get("/sample-collections")
def list_sample_collections(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_lab_dept: str | None = Depends(get_own_lab_department),
):
    stmt = select(SampleCollection).order_by(SampleCollection.created_at.desc())
    stmt = _lab_branch_filter(stmt, SampleCollection, current_user, branch)
    rows = list(db.scalars(stmt).all())
    if own_lab_dept:
        allowed_names = _test_names_in_department(db, own_lab_dept)
        if allowed_names:
            rows = [r for r in rows if allowed_names.intersection(r.ordered_tests or [])]
    return [_camel(r) for r in rows]


@router.post("/sample-collections", status_code=201)
def create_sample_collection(payload: SampleCollectionIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    count = db.query(SampleCollection).count()
    cid = f"SMP-{datetime.now().year}-{count + 101}"
    resolved_branch = payload.branch or current_user.branch or "Main Branch"
    row = SampleCollection(
        collection_id=cid, patient_uhid=payload.patientUhid, patient_name=payload.patientName,
        age=payload.age, gender=payload.gender, doctor_name=payload.doctorName,
        department=payload.department, ordered_tests=payload.orderedTests,
        sample_type=payload.sampleType, container=payload.container, barcode=payload.barcode,
        collection_date=payload.collectionDate, collection_time=payload.collectionTime,
        collected_by=payload.collectedBy, priority=payload.priority, status=payload.status,
        remarks=payload.remarks,
        er_encounter_id=payload.erEncounterId,
        is_emergency=payload.isEmergency,
        branch=resolved_branch,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


@router.patch("/sample-collections/{item_id}/status")
def update_sample_status(item_id: str, payload: SampleStatusUpdate, db: Session = Depends(get_db), _=_auth):
    row = db.get(SampleCollection, item_id)
    if not row:
        raise HTTPException(404, "Sample not found")
    row.status = payload.status
    if payload.technician:
        row.collected_by = payload.technician
    if payload.remarks:
        row.remarks = payload.remarks
    db.commit(); db.refresh(row)
    return _camel(row)


# ── Sample Processing ─────────────────────────────────────────
# Lab-department scoping (Phase 15, see CHANGELOG.md): each SampleProcessing
# row is a per-test record — SampleProcessing.test_name maps directly to
# LabTestMaster.test_name, so scoping can be done as a direct name-match
# without a second join through sample_id. This is simpler than the
# sample_id -> SampleCollection.collection_id -> ordered_tests path, and
# more semantically correct: a tech in Hematology only sees Hematology-
# section processing records, even if the physical sample is multi-test.

@router.get("/sample-processing")
def list_sample_processing(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_lab_dept: str | None = Depends(get_own_lab_department),
):
    stmt = select(SampleProcessing).order_by(SampleProcessing.created_at.desc())
    stmt = _lab_branch_filter(stmt, SampleProcessing, current_user, branch)
    rows = list(db.scalars(stmt).all())
    if own_lab_dept:
        allowed_names = _test_names_in_department(db, own_lab_dept)
        if allowed_names:
            rows = [r for r in rows if r.test_name in allowed_names]
    return [_camel(r) for r in rows]


@router.post("/sample-processing", status_code=201)
def create_sample_processing(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    sample_id = payload.get("sampleId", "")
    resolved_branch = payload.get("branch") or current_user.branch
    if not resolved_branch and sample_id:
        sc = db.scalar(select(SampleCollection).where(SampleCollection.collection_id == sample_id))
        if sc and sc.branch:
            resolved_branch = sc.branch
    if not resolved_branch:
        resolved_branch = "Main Branch"

    row = SampleProcessing(
        sample_id=sample_id,
        patient_name=payload.get("patientName", ""),
        patient_uhid=payload.get("patientUhid", ""),
        test_name=payload.get("testName", ""),
        analyzer=payload.get("analyzer", "Automated Analyzer"),
        machine=payload.get("machine", ""),
        assigned_technician=payload.get("assignedTechnician", "Unassigned"),
        processing_start=payload.get("processingStart", "Pending"),
        processing_end=payload.get("processingEnd", "Pending"),
        duration=payload.get("duration", "0 mins"),
        status=payload.get("status", "Pending"),
        qc_status=payload.get("qcStatus", "Pending"),
        notes=payload.get("notes"),
        branch=resolved_branch,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


@router.patch("/sample-processing/{item_id}/status")
def update_processing_status(item_id: str, payload: ProcessingStatusUpdate, db: Session = Depends(get_db), _=_auth):
    row = db.get(SampleProcessing, item_id)
    if not row:
        raise HTTPException(404, "Processing record not found")
    row.status = payload.status
    if payload.technician:
        row.assigned_technician = payload.technician
    if payload.status == "In Processing":
        row.processing_start = datetime.now().strftime("%I:%M %p")
        row.duration = "In Progress"
    elif payload.status == "Completed":
        row.processing_end = datetime.now().strftime("%I:%M %p")
        row.qc_status = "Passed"
        row.duration = "15 mins"
    db.commit(); db.refresh(row)
    return _camel(row)



# ── Lab Results ───────────────────────────────────────────────
# Same direct test_name scoping as /sample-processing above: each LabResult
# row is a per-test record, so LabResult.test_name maps directly to
# LabTestMaster.test_name without any additional join.

@router.get("/results")
def list_results(
    patient_uhid: str | None = None,
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_lab_dept: str | None = Depends(get_own_lab_department),
):
    stmt = select(LabResult).order_by(LabResult.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(LabResult.patient_uhid == patient_uhid)
    stmt = _lab_branch_filter(stmt, LabResult, current_user, branch)
    rows = list(db.scalars(stmt).all())
    if own_lab_dept:
        allowed_names = _test_names_in_department(db, own_lab_dept)
        if allowed_names:
            rows = [r for r in rows if r.test_name in allowed_names]
    return [_camel(r) for r in rows]


@router.post("/results", status_code=201)
def create_result(payload: LabResultIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    resolved_branch = payload.branch or current_user.branch
    if not resolved_branch and payload.sampleId:
        sc = db.scalar(select(SampleCollection).where(SampleCollection.collection_id == payload.sampleId))
        if sc and sc.branch:
            resolved_branch = sc.branch
    if not resolved_branch:
        resolved_branch = "Main Branch"

    row = LabResult(
        patient_name=payload.patientName, patient_uhid=payload.patientUhid,
        test_name=payload.testName, test_code=payload.testCode, sample_id=payload.sampleId,
        result_value=payload.resultValue, unit=payload.unit, reference_range=payload.referenceRange,
        flag=payload.flag, technician=payload.technician, verified_by=payload.verifiedBy,
        entry_date=payload.entryDate, status=payload.status, notes=payload.notes,
        branch=resolved_branch,
    )
    db.add(row); db.commit(); db.refresh(row)

    # Sync result value into matching LabReport test_results JSON in DB
    reports = list(db.scalars(select(LabReport).where(LabReport.patient_uhid == payload.patientUhid)).all())
    for rep in reports:
        if rep.test_results:
            updated_tr = []
            changed = False
            for tr in rep.test_results:
                if isinstance(tr, dict) and tr.get("testName", "").lower().strip() == payload.testName.lower().strip():
                    tr["resultValue"] = payload.resultValue
                    if payload.flag: tr["flag"] = payload.flag
                    if payload.unit: tr["unit"] = payload.unit
                    if payload.referenceRange: tr["referenceRange"] = payload.referenceRange
                    changed = True
                updated_tr.append(tr)
            if changed:
                rep.test_results = list(updated_tr)
                flag_modified(rep, "test_results")
                db.commit()

    return _camel(row)


@router.put("/results/{item_id}")
def update_result(item_id: str, payload: LabResultUpdate, db: Session = Depends(get_db), _=_auth, _perm=_perm_edit):
    row = db.get(LabResult, item_id)
    if not row:
        raise HTTPException(404, "Result not found")
    if payload.resultValue is not None: row.result_value = payload.resultValue
    if payload.flag is not None: row.flag = payload.flag
    if payload.status is not None: row.status = payload.status
    if payload.verifiedBy is not None: row.verified_by = payload.verifiedBy
    if payload.notes is not None: row.notes = payload.notes
    db.commit(); db.refresh(row)

    # Sync updated result value into matching LabReport test_results JSON in DB
    if payload.resultValue is not None:
        reports = list(db.scalars(select(LabReport).where(LabReport.patient_uhid == row.patient_uhid)).all())
        for rep in reports:
            if rep.test_results:
                updated_tr = []
                changed = False
                for tr in rep.test_results:
                    if isinstance(tr, dict) and tr.get("testName", "").lower().strip() == row.test_name.lower().strip():
                        tr["resultValue"] = payload.resultValue
                        if payload.flag: tr["flag"] = payload.flag
                        changed = True
                    updated_tr.append(tr)
                if changed:
                    rep.test_results = list(updated_tr)
                    flag_modified(rep, "test_results")
                    db.commit()

    return _camel(row)


# ── Lab Reports ───────────────────────────────────────────────
# Same lab-department scoping as sample collections above, matching against
# LabReport.tests (also a JSON list of test names, same shape as
# SampleCollection.ordered_tests).

@router.get("/reports")
def list_reports(
    patient_uhid: str | None = None,
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_lab_dept: str | None = Depends(get_own_lab_department),
):
    from sqlalchemy import case
    status_order = case(
        (LabReport.doctor_review_status == "Approved", 1),
        (LabReport.doctor_review_status == "Rejected", 2),
        else_=0,
    )
    stmt = select(LabReport).order_by(status_order.asc(), LabReport.is_emergency.desc(), LabReport.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(LabReport.patient_uhid == patient_uhid)
    stmt = _lab_branch_filter(stmt, LabReport, current_user, branch)
    rows = list(db.scalars(stmt).all())
    if own_lab_dept:
        allowed_names = _test_names_in_department(db, own_lab_dept)
        if allowed_names:
            rows = [r for r in rows if allowed_names.intersection(r.tests or [])]

    # Cross-reference with all LabResult records in DB to populate missing/pending result_values
    all_results = list(db.scalars(select(LabResult)).all())
    results_map = {(res.patient_uhid.lower(), res.test_name.lower().strip()): res for res in all_results}

    out = []
    for r in rows:
        d = _camel(r)
        if d.get("testResults"):
            updated_tr = []
            for tr in d["testResults"]:
                val = tr.get("resultValue")
                if not val or val in ["(Pending)", "Pending Result", "Pending Lab Analysis"]:
                    key = (r.patient_uhid.lower(), tr.get("testName", "").lower().strip())
                    if key in results_map:
                        res = results_map[key]
                        if res.result_value:
                            tr["resultValue"] = res.result_value
                            if res.flag: tr["flag"] = res.flag
                            if res.unit: tr["unit"] = res.unit
                            if res.reference_range: tr["referenceRange"] = res.reference_range
                updated_tr.append(tr)
            d["testResults"] = updated_tr
        out.append(d)

    return out


@router.post("/reports", status_code=201)
def create_lab_report(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    rep_num = payload.get("reportNumber")
    uhid = payload.get("patientUhid")
    pname = payload.get("patientName")

    existing = None
    if rep_num:
        existing = db.scalar(select(LabReport).where(func.lower(LabReport.report_number) == rep_num.strip().lower()))
    if not existing and uhid:
        existing = db.scalar(select(LabReport).where(func.lower(LabReport.patient_uhid) == uhid.strip().lower()))
    if not existing and pname:
        existing = db.scalar(select(LabReport).where(func.lower(LabReport.patient_name) == pname.strip().lower()))

    if existing:
        if "testResults" in payload and payload["testResults"] is not None:
            existing.test_results = payload["testResults"]
            flag_modified(existing, "test_results")
        if "tests" in payload and payload["tests"] is not None:
            existing.tests = payload["tests"]
        if "doctorComments" in payload and payload["doctorComments"] is not None:
            existing.doctor_comments = payload["doctorComments"]
        if "status" in payload and payload["status"] is not None:
            existing.status = payload["status"]
        if "doctorReviewStatus" in payload and payload["doctorReviewStatus"] is not None:
            existing.doctor_review_status = payload["doctorReviewStatus"]
        if "generatedDate" in payload and payload["generatedDate"] is not None:
            existing.generated_date = payload["generatedDate"]
        if "generatedBy" in payload and payload["generatedBy"] is not None:
            existing.generated_by = payload["generatedBy"]
        if "doctorName" in payload and payload["doctorName"]:
            existing.doctor_name = payload["doctorName"]
        if "department" in payload and payload["department"]:
            existing.department = payload["department"]
        if payload.get("branch"):
            existing.branch = payload["branch"]
        if payload.get("erEncounterId"):
            existing.er_encounter_id = payload["erEncounterId"]
        if "isEmergency" in payload or "is_emergency" in payload:
            existing.is_emergency = bool(payload.get("isEmergency", payload.get("is_emergency")))

        db.commit()
        db.refresh(existing)
        return _camel(existing)

    resolved_branch = payload.get("branch") or current_user.branch
    if not resolved_branch and uhid:
        from app.models.patient import Patient
        pat = db.scalar(select(Patient).where(Patient.uhid == uhid.strip()))
        if pat and pat.branch:
            resolved_branch = pat.branch
    if not resolved_branch:
        resolved_branch = "Main Branch"

    rnum = rep_num or f"LIS-REP-{datetime.now().year}-{''.join(random.choices(string.digits, k=4))}"
    row = LabReport(
        report_number=rnum,
        patient_name=payload.get("patientName", ""),
        patient_uhid=payload.get("patientUhid", ""),
        patient_age=payload.get("patientAge", 0),
        patient_gender=payload.get("patientGender", "Male"),
        doctor_name=payload.get("doctorName", ""),
        department=payload.get("department", ""),
        tests=payload.get("tests", []),
        test_results=payload.get("testResults", []),
        generated_date=payload.get("generatedDate", datetime.now().strftime("%Y-%m-%d %I:%M %p")),
        generated_by=payload.get("generatedBy", "System"),
        status=payload.get("status", "Generated"),
        doctor_review_status=payload.get("doctorReviewStatus", "Pending Review"),
        doctor_comments=payload.get("doctorComments"),
        er_encounter_id=payload.get("erEncounterId"),
        is_emergency=bool(payload.get("isEmergency")),
        branch=resolved_branch,
    )
    db.add(row); db.commit(); db.refresh(row)

    notify_user_or_role(
        db,
        title="Lab Report Ready",
        message=f"Lab report {rnum} for {row.patient_name} ({', '.join(row.tests or [])}) is ready for review.",
        module="lab",
        event_type="lab_report_ready",
        recipient_role="doctor",
        related_record_id=row.id,
    )

    return _camel(row)


def _get_report(db: Session, item_id: str) -> LabReport | None:
    """Lookup LabReport by UUID primary key, report_number, patient_uhid, or patient_name."""
    try:
        row = db.get(LabReport, item_id)
        if row:
            return row
    except Exception:
        pass

    clean_id = item_id.strip().lower()
    stmt = select(LabReport).where(
        or_(
            func.lower(LabReport.report_number) == clean_id,
            func.lower(LabReport.patient_uhid) == clean_id,
            func.lower(LabReport.patient_name) == clean_id,
        )
    )
    return db.scalar(stmt)


@router.patch("/reports/{item_id}/status")
def update_report_status(item_id: str, payload: ReportStatusUpdate, db: Session = Depends(get_db), _=_auth):
    row = _get_report(db, item_id)
    if not row:
        raise HTTPException(404, "Report not found")
    row.status = payload.status
    db.commit(); db.refresh(row)
    return _camel(row)


@router.put("/reports/{item_id}")
def update_report(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_edit):
    row = _get_report(db, item_id)
    if not row:
        uhid = payload.get("patientUhid")
        pname = payload.get("patientName")
        if uhid:
            row = db.scalar(select(LabReport).where(func.lower(LabReport.patient_uhid) == uhid.strip().lower()))
        if not row and pname:
            row = db.scalar(select(LabReport).where(func.lower(LabReport.patient_name) == pname.strip().lower()))

    if not row:
        raise HTTPException(404, "Report not found")
    if "testResults" in payload:
        row.test_results = payload["testResults"]
        flag_modified(row, "test_results")
    if "doctorComments" in payload:
        row.doctor_comments = payload["doctorComments"]
    if "status" in payload:
        row.status = payload["status"]
    if "doctorReviewStatus" in payload:
        row.doctor_review_status = payload["doctorReviewStatus"]
    if "tests" in payload:
        row.tests = payload["tests"]
    if "patientName" in payload and payload["patientName"]:
        row.patient_name = payload["patientName"]
    if "doctorName" in payload and payload["doctorName"]:
        row.doctor_name = payload["doctorName"]
    if "department" in payload and payload["department"]:
        row.department = payload["department"]
    db.commit()
    db.refresh(row)
    return _camel(row)


@router.patch("/reports/{item_id}/doctor-review")
@router.patch("/reports/{item_id}/review")
def doctor_review_report(item_id: str, payload: DoctorReviewIn, db: Session = Depends(get_db), _=_auth):
    row = _get_report(db, item_id)
    if not row:
        raise HTTPException(404, "Report not found")
    row.doctor_review_status = payload.reviewStatus
    if payload.comments:
        row.doctor_comments = payload.comments
    row.doctor_review_date = datetime.now().strftime("%Y-%m-%d %I:%M %p")
    if payload.reviewStatus == "Approved":
        row.status = "Approved"
    db.commit(); db.refresh(row)
    return _camel(row)


# ── OPD Order (routes into the real Sample Collection queue) ──
#
# This used to fabricate a complete "Verified" LabReport with made-up result
# values (a hardcoded technician, a hardcoded pathologist, invented reference
# ranges) the instant a doctor ordered a test from OPD -- before any sample
# had actually been collected or tested. That's exactly the "fake laboratory
# reports" mock data the project brief calls out, and worse: it bypassed the
# real Sample Collection -> Processing -> Result Entry -> Doctor Review
# pipeline entirely, so a lab technician's worklist would never even see the
# order. Now it creates a real, pending SampleCollection instead -- the
# lab technician collects the sample and fills in the real collection
# details (barcode, container, collected-by) via PATCH
# /sample-collections/{id}/status, same as a walk-in order.

@router.post("/opd-order", status_code=201)
def create_opd_order(payload: OPDOrderIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    collection_id = f"SMP-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    barcode = f"BC-{''.join(random.choices(string.digits, k=6))}"

    # Best-effort: pull the sample type/container from the test master for
    # the first ordered test, since that's what a real lab tech would need
    # to know when they go collect it. Falls back to a generic placeholder
    # if the test isn't in the master list (e.g. a free-text test name).
    sample_type = "To Be Determined"
    container = "To Be Determined"
    if payload.tests:
        test_row = db.scalar(
            select(LabTestMaster).where(LabTestMaster.test_name == payload.tests[0])
        )
        if test_row:
            sample_type = test_row.sample_type
            container = test_row.container_type

    resolved_branch = payload.branch or current_user.branch
    if not resolved_branch and payload.doctorName:
        from app.models.doctor import Doctor
        doc = db.scalar(select(Doctor).where(func.lower(Doctor.name) == payload.doctorName.lower().strip()))
        if doc and doc.branch:
            resolved_branch = doc.branch
    if not resolved_branch and payload.patientUhid:
        from app.models.patient import Patient
        pat = db.scalar(select(Patient).where(Patient.uhid == payload.patientUhid.strip()))
        if pat and pat.branch:
            resolved_branch = pat.branch
    if not resolved_branch:
        resolved_branch = "Main Branch"

    row = SampleCollection(
        collection_id=collection_id,
        patient_uhid=payload.patientUhid,
        patient_name=payload.patientName,
        age=payload.age,
        gender=payload.gender,
        doctor_name=payload.doctorName,
        department=payload.department,
        ordered_tests=payload.tests,
        sample_type=sample_type,
        container=container,
        barcode=barcode,
        collection_date="",
        collection_time="",
        collected_by="",
        priority="Normal",
        status="Pending",
        remarks="Ordered from OPD consultation -- awaiting physical sample collection.",
        er_encounter_id=payload.erEncounterId,
        is_emergency=payload.isEmergency,
        branch=resolved_branch,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    activity = LabActivity(
        type="opd_order",
        title=f"New OPD test order for {payload.patientName}: {', '.join(payload.tests)}",
        time=datetime.now().strftime("%Y-%m-%d %I:%M %p"),
        user=payload.doctorName,
        priority="Normal",
    )
    db.add(activity)
    db.commit()

    notify_user_or_role(
        db,
        title="New Lab Test Order",
        message=f"New test order for {payload.patientName} ({', '.join(payload.tests)}) from Dr. {payload.doctorName} at {resolved_branch}.",
        module="lab",
        event_type="new_lab_order",
        recipient_role="lab",
        related_record_id=row.id,
    )

    return _camel(row)


# ── Activities ────────────────────────────────────────────────

@router.get("/activities")
def list_activities(db: Session = Depends(get_db), _=_auth):
    rows = db.scalars(select(LabActivity).order_by(LabActivity.created_at.desc()).limit(50)).all()
    return [_camel(r) for r in rows]


@router.post("/activities", status_code=201)
def create_activity(payload: ActivityIn, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    row = LabActivity(
        type=payload.type, title=payload.title,
        time=datetime.now().strftime("%I:%M %p"), user=payload.user, priority=payload.priority,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


# ── Alias Routes (frontend-friendly shortcuts) ────────────────

@router.get("/orders")
def list_orders_alias(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_lab_dept: str | None = Depends(get_own_lab_department),
):
    """Alias for /sample-collections — used by frontend LabContext"""
    stmt = select(SampleCollection).order_by(SampleCollection.created_at.desc())
    stmt = _lab_branch_filter(stmt, SampleCollection, current_user, branch)
    rows = list(db.scalars(stmt).all())
    if own_lab_dept:
        allowed_names = _test_names_in_department(db, own_lab_dept)
        if allowed_names:
            rows = [r for r in rows if allowed_names.intersection(r.ordered_tests or [])]
    return [_camel(r) for r in rows]


@router.post("/orders", status_code=201)
def create_order_alias(payload: SampleCollectionIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    """Alias for POST /sample-collections"""
    count = db.query(SampleCollection).count()
    cid = f"SMP-{datetime.now().year}-{count + 101}"
    resolved_branch = payload.branch or current_user.branch or "Main Branch"
    row = SampleCollection(
        collection_id=cid, patient_uhid=payload.patientUhid, patient_name=payload.patientName,
        age=payload.age, gender=payload.gender, doctor_name=payload.doctorName,
        department=payload.department, ordered_tests=payload.orderedTests,
        sample_type=payload.sampleType, container=payload.container, barcode=payload.barcode,
        collection_date=payload.collectionDate, collection_time=payload.collectionTime,
        collected_by=payload.collectedBy, priority=payload.priority, status=payload.status,
        remarks=payload.remarks,
        branch=resolved_branch,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


@router.get("/samples")
def list_samples_alias(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_lab_dept: str | None = Depends(get_own_lab_department),
):
    """Alias for /sample-processing — used by frontend LabContext. Same
    lab-department scoping as list_sample_processing() above."""
    stmt = select(SampleProcessing).order_by(SampleProcessing.created_at.desc())
    stmt = _lab_branch_filter(stmt, SampleProcessing, current_user, branch)
    rows = list(db.scalars(stmt).all())
    if own_lab_dept:
        allowed_names = _test_names_in_department(db, own_lab_dept)
        if allowed_names:
            rows = [r for r in rows if r.test_name in allowed_names]
    return [_camel(r) for r in rows]
