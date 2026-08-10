from pydantic import BaseModel, Field, ConfigDict


# --- Hospital Profile ---
class HospitalProfileBase(BaseModel):
    hospital_name: str = "Hospital Group"
    hospital_code: str = "HOSP-001"
    tagline: str | None = None
    logo: str | None = None
    hospital_logo_url: str | None = None
    registration_number: str | None = None
    license_number: str | None = None
    tax_id: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    pincode: str | None = None
    timezone: str | None = None
    currency: str | None = None
    establishment_year: str | None = None
    established_year: str | None = None
    accreditation: str | None = None
    total_bed_capacity: int = 0
    emergency_contact_number: str | None = None


class HospitalProfileCreate(HospitalProfileBase):
    pass


class HospitalProfileOut(HospitalProfileBase):
    id: str

    class Config:
        from_attributes = True


# --- Branch ---
class BranchBase(BaseModel):
    branch_name: str = "Main Branch"
    branch_code: str = "BR-001"
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = "India"
    pincode: str | None = None
    phone: str | None = None
    email: str | None = None
    status: str = "Active"
    is_main_branch: bool = False
    bed_capacity: int = 0
    total_staff: int = 0


class BranchCreate(BranchBase):
    pass


class BranchOut(BranchBase):
    id: str

    class Config:
        from_attributes = True


# --- Specialization ---
class SpecializationBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    specialization_name: str = Field(..., alias="specializationName")
    code: str | None = None
    department_name: str | None = Field("General", alias="associatedDepartment")
    description: str | None = None
    status: str = "Active"


class SpecializationCreate(SpecializationBase):
    pass


class SpecializationOut(SpecializationBase):
    id: str

    class Config:
        from_attributes = True


# --- Consultation Charge ---
class ConsultationChargeBase(BaseModel):
    doctor_id: str | None = None
    doctor_name: str
    department: str
    consultation_fee: float
    follow_up_fee: float = 0.0
    emergency_fee: float = 0.0
    validity_days: int = 7
    status: str = "Active"


class ConsultationChargeCreate(ConsultationChargeBase):
    pass


class ConsultationChargeOut(ConsultationChargeBase):
    id: str

    class Config:
        from_attributes = True


# --- Working Hours ---
class WorkingHoursBase(BaseModel):
    department: str | None = None
    day_of_week: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    slot_duration_minutes: int | None = 15
    max_patients_per_slot: int | None = 1
    is_working_day: bool | None = True


class WorkingHoursCreate(WorkingHoursBase):
    pass


class WorkingHoursOut(WorkingHoursBase):
    id: str

    class Config:
        from_attributes = True


# --- Leave Request ---
class LeaveRequestBase(BaseModel):
    employee_id: str
    employee_name: str
    role: str | None = None
    department: str
    leave_type: str
    start_date: str
    end_date: str
    total_days: int = 1
    reason: str
    approval_status: str = "Pending"
    applied_date: str


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestOut(LeaveRequestBase):
    id: str

    class Config:
        from_attributes = True


# --- Shift Rotation ---
class ShiftRotationBase(BaseModel):
    employee_id: str
    employee_name: str
    department: str
    branch: str | None = None
    morning_shift: str | None = None
    evening_shift: str | None = None
    night_shift: str | None = None
    assigned_shift: str
    effective_date: str | None = None
    start_date: str
    end_date: str
    status: str = "Active"
    notes: str | None = None


class ShiftRotationCreate(ShiftRotationBase):
    pass


class ShiftRotationOut(ShiftRotationBase):
    id: str

    class Config:
        from_attributes = True


# --- Role & Permission ---
class RoleItemBase(BaseModel):
    role_name: str
    role_code: str
    description: str | None = None
    is_system_default: bool = False
    assigned_user_count: int = 0


class RoleItemCreate(RoleItemBase):
    pass


class RoleItemOut(RoleItemBase):
    id: str

    class Config:
        from_attributes = True


class PermissionItemBase(BaseModel):
    role_id: str
    module_name: str
    action: str
    is_granted: bool = True


class PermissionItemCreate(PermissionItemBase):
    pass


class PermissionItemOut(PermissionItemBase):
    id: str

    class Config:
        from_attributes = True


# --- Department Assignment ---
class DepartmentAssignmentBase(BaseModel):
    employee_id: str
    employee_name: str
    role: str
    primary_department: str
    secondary_department: str | None = None
    shift_type: str = "General"
    assigned_date: str


class DepartmentAssignmentCreate(DepartmentAssignmentBase):
    pass


class DepartmentAssignmentOut(DepartmentAssignmentBase):
    id: str

    class Config:
        from_attributes = True


# --- Login History ---
class LoginHistoryItemBase(BaseModel):
    user_name: str
    email: str
    role: str
    ip_address: str = "127.0.0.1"
    browser: str = "Chrome"
    login_time: str
    status: str = "Success"


class LoginHistoryItemOut(LoginHistoryItemBase):
    id: str

    class Config:
        from_attributes = True
