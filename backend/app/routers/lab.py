from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Any
import random, string
from datetime import datetime

from app.core.database import get_db
from app.deps import get_current_active_user
from app.models.lab import LabTestMaster, SampleCollection, SampleProcessing, LabResult, LabReport, LabActivity

router = APIRouter(prefix="/lab", tags=["Lab"])
_auth = Depends(get_current_active_user)


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

class ActivityIn(BaseModel):
    type: str
    title: str
    user: str
    priority: str = "Normal"


def _row_to_dict(row) -> dict:
    """Convert SQLAlchemy model to camelCase dict for frontend."""
    d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
    return d


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
        "doctor_review_date": "doctorReviewDate", "created_at": "createdAt", "updated_at": "updatedAt",
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
def create_test_master(payload: TestMasterIn, db: Session = Depends(get_db), _=_auth):
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
def update_test_master(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth):
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
def delete_test_master(item_id: str, db: Session = Depends(get_db), _=_auth):
    row = db.get(LabTestMaster, item_id)
    if row:
        db.delete(row); db.commit()


# ── Sample Collections ────────────────────────────────────────

@router.get("/sample-collections")
def list_sample_collections(db: Session = Depends(get_db), _=_auth):
    rows = db.scalars(select(SampleCollection).order_by(SampleCollection.created_at.desc())).all()
    return [_camel(r) for r in rows]


@router.post("/sample-collections", status_code=201)
def create_sample_collection(payload: SampleCollectionIn, db: Session = Depends(get_db), _=_auth):
    count = db.query(SampleCollection).count()
    cid = f"SMP-{datetime.now().year}-{count + 101}"
    row = SampleCollection(
        collection_id=cid, patient_uhid=payload.patientUhid, patient_name=payload.patientName,
        age=payload.age, gender=payload.gender, doctor_name=payload.doctorName,
        department=payload.department, ordered_tests=payload.orderedTests,
        sample_type=payload.sampleType, container=payload.container, barcode=payload.barcode,
        collection_date=payload.collectionDate, collection_time=payload.collectionTime,
        collected_by=payload.collectedBy, priority=payload.priority, status=payload.status,
        remarks=payload.remarks,
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

@router.get("/sample-processing")
def list_sample_processing(db: Session = Depends(get_db), _=_auth):
    rows = db.scalars(select(SampleProcessing).order_by(SampleProcessing.created_at.desc())).all()
    return [_camel(r) for r in rows]


@router.post("/sample-processing", status_code=201)
def create_sample_processing(payload: dict, db: Session = Depends(get_db), _=_auth):
    row = SampleProcessing(
        sample_id=payload.get("sampleId", ""),
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

@router.get("/results")
def list_results(patient_uhid: str | None = None, db: Session = Depends(get_db), _=_auth):
    stmt = select(LabResult).order_by(LabResult.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(LabResult.patient_uhid == patient_uhid)
    return [_camel(r) for r in db.scalars(stmt).all()]


@router.post("/results", status_code=201)
def create_result(payload: LabResultIn, db: Session = Depends(get_db), _=_auth):
    row = LabResult(
        patient_name=payload.patientName, patient_uhid=payload.patientUhid,
        test_name=payload.testName, test_code=payload.testCode, sample_id=payload.sampleId,
        result_value=payload.resultValue, unit=payload.unit, reference_range=payload.referenceRange,
        flag=payload.flag, technician=payload.technician, verified_by=payload.verifiedBy,
        entry_date=payload.entryDate, status=payload.status, notes=payload.notes,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


@router.put("/results/{item_id}")
def update_result(item_id: str, payload: LabResultUpdate, db: Session = Depends(get_db), _=_auth):
    row = db.get(LabResult, item_id)
    if not row:
        raise HTTPException(404, "Result not found")
    if payload.resultValue is not None: row.result_value = payload.resultValue
    if payload.flag is not None: row.flag = payload.flag
    if payload.status is not None: row.status = payload.status
    if payload.verifiedBy is not None: row.verified_by = payload.verifiedBy
    if payload.notes is not None: row.notes = payload.notes
    db.commit(); db.refresh(row)
    return _camel(row)


# ── Lab Reports ───────────────────────────────────────────────

@router.get("/reports")
def list_reports(patient_uhid: str | None = None, db: Session = Depends(get_db), _=_auth):
    stmt = select(LabReport).order_by(LabReport.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(LabReport.patient_uhid == patient_uhid)
    return [_camel(r) for r in db.scalars(stmt).all()]


@router.post("/reports", status_code=201)
def create_report(payload: dict, db: Session = Depends(get_db), _=_auth):
    rnum = f"LIS-REP-{datetime.now().year}-{''.join(random.choices(string.digits, k=4))}"
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
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


@router.patch("/reports/{item_id}/status")
def update_report_status(item_id: str, payload: ReportStatusUpdate, db: Session = Depends(get_db), _=_auth):
    row = db.get(LabReport, item_id)
    if not row:
        raise HTTPException(404, "Report not found")
    row.status = payload.status
    db.commit(); db.refresh(row)
    return _camel(row)


@router.patch("/reports/{item_id}/doctor-review")
def doctor_review_report(item_id: str, payload: DoctorReviewIn, db: Session = Depends(get_db), _=_auth):
    row = db.get(LabReport, item_id)
    if not row:
        raise HTTPException(404, "Report not found")
    row.doctor_review_status = payload.reviewStatus
    if payload.comments:
        row.doctor_comments = payload.comments
    row.doctor_review_date = datetime.now().strftime("%Y-%m-%d %I:%M %p")
    db.commit(); db.refresh(row)
    return _camel(row)


# ── OPD Order (creates results + report in one shot) ─────────

@router.post("/opd-order", status_code=201)
def create_opd_order(payload: OPDOrderIn, db: Session = Depends(get_db), _=_auth):
    sample_id = f"SMP-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    report_num = f"LIS-REP-{datetime.now().year}-{''.join(random.choices(string.digits, k=4))}"
    now_str = datetime.now().strftime("%Y-%m-%d %I:%M %p")

    def mock_result(test_name: str, idx: int) -> dict:
        lower = test_name.lower()
        if "hba1c" in lower: rv, unit, rr, flag = "7.4", "%", "< 5.7%", "High"
        elif "cbc" in lower or "blood count" in lower: rv, unit, rr, flag = "13.8", "g/dL", "12.0-15.5 g/dL", "Normal"
        elif "fasting" in lower: rv, unit, rr, flag = "142", "mg/dL", "70-99 mg/dL", "High"
        elif "lipid" in lower: rv, unit, rr, flag = "235", "mg/dL", "< 200 mg/dL", "High"
        elif "kidney" in lower or "kft" in lower: rv, unit, rr, flag = "1.4", "mg/dL", "0.6-1.2 mg/dL", "High"
        elif "liver" in lower or "lft" in lower: rv, unit, rr, flag = "38", "U/L", "7-56 U/L", "Normal"
        elif "thyroid" in lower or "tsh" in lower: rv, unit, rr, flag = "5.8", "µIU/mL", "0.45-4.50 µIU/mL", "High"
        elif "urine" in lower: rv, unit, rr, flag = "Pus Cells 2-4/HPF", "HPF", "0-5/HPF", "Normal"
        else: rv, unit, rr, flag = "Normal", "Units", "Standard Reference", "Normal"
        return {
            "id": f"res-opd-{idx}", "patientName": payload.patientName, "patientUhid": payload.patientUhid,
            "testName": test_name, "testCode": test_name[:4].upper() + f"-00{idx+1}",
            "sampleId": sample_id, "resultValue": rv, "unit": unit, "referenceRange": rr,
            "flag": flag, "technician": "Tech. Robert Vance", "verifiedBy": "Dr. Suresh Mehta",
            "entryDate": now_str, "status": "Verified", "notes": f"Auto-generated result for {test_name}",
        }

    results = [mock_result(t, i) for i, t in enumerate(payload.tests)]

    report = LabReport(
        report_number=report_num, patient_name=payload.patientName, patient_uhid=payload.patientUhid,
        patient_age=payload.age, patient_gender=payload.gender, doctor_name=payload.doctorName,
        department=payload.department, tests=payload.tests, test_results=results,
        generated_date=now_str, generated_by="System Auto-Generated",
        status="Generated", doctor_review_status="Pending Review",
        doctor_comments="Awaiting doctor clinical impression & review reply.",
    )
    db.add(report); db.commit(); db.refresh(report)
    return _camel(report)


# ── Activities ────────────────────────────────────────────────

@router.get("/activities")
def list_activities(db: Session = Depends(get_db), _=_auth):
    rows = db.scalars(select(LabActivity).order_by(LabActivity.created_at.desc()).limit(50)).all()
    return [_camel(r) for r in rows]


@router.post("/activities", status_code=201)
def create_activity(payload: ActivityIn, db: Session = Depends(get_db), _=_auth):
    row = LabActivity(
        type=payload.type, title=payload.title,
        time=datetime.now().strftime("%I:%M %p"), user=payload.user, priority=payload.priority,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


# ── Alias Routes (frontend-friendly shortcuts) ────────────────

@router.get("/orders")
def list_orders_alias(db: Session = Depends(get_db), _=_auth):
    """Alias for /sample-collections — used by frontend LabContext"""
    rows = db.scalars(select(SampleCollection).order_by(SampleCollection.created_at.desc())).all()
    return [_camel(r) for r in rows]


@router.post("/orders", status_code=201)
def create_order_alias(payload: SampleCollectionIn, db: Session = Depends(get_db), _=_auth):
    """Alias for POST /sample-collections"""
    count = db.query(SampleCollection).count()
    cid = f"SMP-{datetime.now().year}-{count + 101}"
    row = SampleCollection(
        collection_id=cid, patient_uhid=payload.patientUhid, patient_name=payload.patientName,
        age=payload.age, gender=payload.gender, doctor_name=payload.doctorName,
        department=payload.department, ordered_tests=payload.orderedTests,
        sample_type=payload.sampleType, container=payload.container, barcode=payload.barcode,
        collection_date=payload.collectionDate, collection_time=payload.collectionTime,
        collected_by=payload.collectedBy, priority=payload.priority, status=payload.status,
        remarks=payload.remarks,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _camel(row)


@router.get("/samples")
def list_samples_alias(db: Session = Depends(get_db), _=_auth):
    """Alias for /sample-processing — used by frontend LabContext"""
    rows = db.scalars(select(SampleProcessing).order_by(SampleProcessing.created_at.desc())).all()
    return [_camel(r) for r in rows]
