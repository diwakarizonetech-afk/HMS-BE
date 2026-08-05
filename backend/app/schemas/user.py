from pydantic import BaseModel, Field, ConfigDict

from app.models.user import UserRole
from app.schemas.common import TimestampedORMBase


class UserBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str = Field("User", alias="fullName")
    email: str
    role: str = "doctor"
    username: str | None = Field(None, alias="userId")
    avatar: str | None = None
    department: str | None = None
    branch: str | None = None
    employee_id: str | None = Field(None, alias="employeeId")
    phone: str | None = None
    status: str = "Active"
    last_login: str | None = Field(None, alias="lastLogin")


class UserCreate(UserBase):
    password: str = "ChangeMe@123"


class UserUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(None, alias="fullName")
    username: str | None = Field(None, alias="userId")
    avatar: str | None = None
    department: str | None = None
    branch: str | None = None
    employee_id: str | None = Field(None, alias="employeeId")
    phone: str | None = None
    status: str | None = None
    is_active: bool | None = None
    last_login: str | None = Field(None, alias="lastLogin")


class UserOut(UserBase, TimestampedORMBase):
    is_active: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordResetRequest(BaseModel):
    new_password: str
