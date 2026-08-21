"""
ER Workflow Integration Test
Run with: python test_er_workflow.py  (from e:\HMS_main\backend with venv active)
"""

import sys
import json
import requests

BASE = "http://localhost:8000/api/v1"
session = requests.Session()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def login(email="admin@hms.com", password="admin123"):
    r = session.post(f"{BASE}/auth/login-json", json={"email": email, "password": password})
    r.raise_for_status()
    token = r.json()["access_token"]
    session.headers["Authorization"] = f"Bearer {token}"
    print(f"✓ Logged in as {email}")
    return r.json()


def ok(label, r):
    if r.status_code not in (200, 201):
        print(f"✗ FAIL [{label}] status={r.status_code}: {r.text[:300]}")
        sys.exit(1)
    print(f"✓ {label} ({r.status_code})")
    return r.json()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_login():
    return login()


def test_list_encounters_empty():
    r = session.get(f"{BASE}/emergency")
    return ok("List ER encounters (initial)", r)


def test_get_or_create_patient():
    """Get first patient or create one for testing."""
    r = session.get(f"{BASE}/patients")
    r.raise_for_status()
    patients = r.json()
    if patients:
        p = patients[0]
        print(f"✓ Using existing patient: {p['uhid']} — {p['first_name']} {p['last_name']}")
        return p
    # Create minimal patient
    payload = {
        "first_name": "Test", "last_name": "ERPatient", "gender": "Male",
        "dob": "1985-06-15", "age": 40, "blood_group": "O+",
        "marital_status": "Single", "nationality": "Indian",
        "mobile": "9999000001", "address": "123 Test Street",
        "city": "Trichy", "state": "Tamil Nadu", "country": "India",
        "pincode": "620001", "aadhaar": "000011112222",
        "emergency_contact_name": "Relative", "emergency_relationship": "Spouse",
        "emergency_phone": "9999000002",
    }
    r = session.post(f"{BASE}/patients", json=payload)
    p = ok("Create test patient", r)
    return p


def test_register_encounter(patient):
    payload = {
        "patient_id": patient["id"],
        "patient_uhid": patient["uhid"],
        "patient_name": f"{patient['first_name']} {patient['last_name']}",
        "arrival_date": "2026-08-19",
        "arrival_time": "10:30 AM",
        "arrival_mode": "Walk-in",
        "emergency_type": "Cardiac",
        "chief_complaint": "Severe chest pain radiating to left arm",
        "patient_age": patient.get("age"),
        "patient_gender": patient.get("gender"),
        "patient_blood_group": patient.get("blood_group"),
        "patient_phone": patient.get("mobile"),
        "patient_allergies": "Penicillin",
        "patient_existing_diseases": "Hypertension",
        "patient_emergency_contact_name": patient.get("emergency_contact_name"),
        "patient_emergency_contact_phone": patient.get("emergency_phone"),
        "patient_emergency_relationship": patient.get("emergency_relationship"),
        "accompanied_by": "Spouse",
        "emergency_contact": "Spouse (+91 9999000002)",
        "assigned_doctor": "Dr. Test Doctor",
        "registered_by": "Reception Admin",
        "branch": "Cantonment Branch",
    }
    r = session.post(f"{BASE}/emergency", json=payload)
    enc = ok("Register ER encounter", r)
    assert enc["encounter_number"].startswith("ERV-"), f"Expected ERV- prefix, got {enc['encounter_number']}"
    assert enc["er_status"] == "Registered", f"Expected Registered, got {enc['er_status']}"
    assert enc["triage_status"] == "Pending Triage", f"Expected Pending Triage"
    print(f"  → Encounter number: {enc['encounter_number']}, ID: {enc['id']}")
    return enc


def test_get_encounter(enc_id):
    r = session.get(f"{BASE}/emergency/{enc_id}")
    enc = ok("Get single ER encounter", r)
    assert enc["id"] == enc_id
    assert enc["patient_allergies"] == "Penicillin"
    assert enc["patient_existing_diseases"] == "Hypertension"
    return enc


def test_update_encounter(enc_id):
    r = session.put(f"{BASE}/emergency/{enc_id}", json={"current_location": "ER Bay 1"})
    enc = ok("Update encounter location", r)
    assert enc["current_location"] == "ER Bay 1"
    return enc


def test_record_triage(enc_id):
    r = session.post(f"{BASE}/emergency/{enc_id}/triage", json={
        "triage_status": "Priority 1 (Red - Critical)",
        "triage_notes": "Acute STEMI suspect — immediate cath lab",
        "triaged_by": "Nurse Anjali",
        "triage_time": "10:35 AM",
    })
    enc = ok("Record triage", r)
    assert enc["triage_status"] == "Priority 1 (Red - Critical)"
    assert enc["er_status"] == "Waiting for Doctor"
    return enc


def test_record_nurse_vitals(enc_id, patient):
    r = session.post(f"{BASE}/clinical/vitals", json={
        "patient_uhid": patient["uhid"],
        "patient_name": f"{patient['first_name']} {patient['last_name']}",
        "recorded_by": "Nurse Anjali",
        "er_encounter_id": enc_id,
        "bp_sys": 145,
        "bp_dia": 92,
        "blood_pressure": "145/92",
        "pulse_rate": 108,
        "spo2": 94,
        "temperature": 99.1,
        "respiratory_rate": 22,
        "pain_scale": 7,
    })
    vital = ok("Record ER nurse vitals", r)
    assert vital["erEncounterId"] == enc_id
    return vital


def test_send_lab_order(enc_id, patient):
    r = session.post(f"{BASE}/lab/opd-order", json={
        "patientName": f"{patient['first_name']} {patient['last_name']}",
        "patientUhid": patient["uhid"],
        "age": patient.get("age") or 40,
        "gender": patient.get("gender") or "Male",
        "doctorName": "Dr. Test Doctor",
        "department": "Emergency Medicine",
        "tests": ["Troponin I STAT"],
        "erEncounterId": enc_id,
    })
    order = ok("Send ER lab order", r)
    assert order["erEncounterId"] == enc_id
    return order


def test_send_pharmacy_order(enc_id, patient):
    r = session.post(f"{BASE}/pharmacy/prescriptions", json={
        "patientName": f"{patient['first_name']} {patient['last_name']}",
        "patientUhid": patient["uhid"],
        "patientAge": patient.get("age") or 40,
        "patientGender": patient.get("gender") or "Male",
        "doctorName": "Dr. Test Doctor",
        "department": "Emergency Medicine",
        "visitDate": "2026-08-20",
        "items": [{"name": "Aspirin", "dosage": "300mg", "frequency": "STAT"}],
        "erEncounterId": enc_id,
    })
    prescription = ok("Send ER pharmacy order", r)
    assert prescription["erEncounterId"] == enc_id
    return prescription


def test_doctor_assessment(enc_id):
    r = session.post(f"{BASE}/emergency/{enc_id}/assessment", json={
        "assessment": "Acute Coronary Syndrome — STEMI pattern on ECG",
        "provisional_diagnosis": "STEMI",
        "doctor_name": "Dr. Test Doctor",
        "severity": "Critical",
        "clinical_examination": "BP 160/100, HR 110, SpO2 94%",
        "assessment_time": "10:45 AM",
    })
    ass = ok("Doctor assessment", r)
    assert ass["doctor_name"] == "Dr. Test Doctor"
    assert ass["encounter_id"] == enc_id
    return ass


def test_record_procedure(enc_id):
    r = session.post(f"{BASE}/emergency/{enc_id}/procedures", json={
        "procedure_name": "IV Access — Large Bore",
        "indication": "Emergency IV line for drug administration",
        "performed_by": "Dr. Test Doctor",
        "outcome": "Successful — right antecubital",
        "procedure_time": "10:47 AM",
    })
    proc = ok("Record ER procedure", r)
    assert proc["encounter_id"] == enc_id
    return proc


def test_list_procedures(enc_id):
    r = session.get(f"{BASE}/emergency/{enc_id}/procedures")
    procs = ok("List ER procedures", r)
    assert len(procs) >= 1
    return procs


def test_set_disposition(enc_id):
    r = session.post(f"{BASE}/emergency/{enc_id}/disposition", json={
        "disposition": "IPD",
        "disposition_notes": "Requires immediate Cardiac ICU admission",
        "required_ward": "Cardiac ICU",
        "doctor_name": "Dr. Test Doctor",
    })
    enc = ok("Set disposition to IPD", r)
    assert enc["er_disposition"] == "IPD"
    assert enc["er_status"] == "IPD Admission Pending"
    return enc


def test_get_timeline(enc_id):
    r = session.get(f"{BASE}/emergency/{enc_id}/timeline")
    timeline = ok("Fetch ER timeline", r)
    assert len(timeline) >= 1
    event_types = {ev.get("event_type") for ev in timeline}
    assert "vital" in event_types
    assert "lab_order" in event_types
    assert "prescription" in event_types
    print(f"  → Timeline events: {len(timeline)}")
    for ev in timeline:
        print(f"    [{ev.get('role', '?')}] {ev.get('title', '?')} — {ev.get('actor', '?')}")
    return timeline


def test_list_encounters_has_data():
    r = session.get(f"{BASE}/emergency")
    encounters = ok("List ER encounters (with data)", r)
    assert len(encounters) >= 1
    return encounters


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  Emergency / ER Management — Integration Tests")
    print("="*60 + "\n")

    test_login()
    test_list_encounters_empty()
    patient = test_get_or_create_patient()
    enc = test_register_encounter(patient)
    enc_id = enc["id"]

    test_get_encounter(enc_id)
    test_update_encounter(enc_id)
    test_record_triage(enc_id)
    test_record_nurse_vitals(enc_id, patient)
    test_send_lab_order(enc_id, patient)
    test_send_pharmacy_order(enc_id, patient)
    test_doctor_assessment(enc_id)
    test_record_procedure(enc_id)
    test_list_procedures(enc_id)
    test_set_disposition(enc_id)
    test_get_timeline(enc_id)
    test_list_encounters_has_data()

    print("\n" + "="*60)
    print("  ✅ ALL TESTS PASSED")
    print("="*60 + "\n")
