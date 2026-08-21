from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.deps import get_current_active_user
from app.models.user import User, UserRole
from app.schemas.user import UserOut, Token, LoginRequest

router = APIRouter(prefix="/auth", tags=["Auth"])

# NOTE: There is intentionally no public /auth/register endpoint. It used to
# exist here unauthenticated and let anyone create an account with any role
# (including super_admin) — a privilege-escalation hole, and the frontend
# never called it anyway. Staff accounts are created by an authenticated
# Super Admin / Hospital Admin via POST /api/v1/superadmin/users instead
# (see app/routers/superadmin.py), which is role-gated.


def _authenticate(db: Session, email_or_username: str, password: str) -> User:
    target = email_or_username.strip().lower()

    user = db.scalar(
        select(User).where(
            (func.lower(User.email) == target) | (func.lower(User.username) == target)
        )
    )

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    user_name = (user.name or "").lower()
    user_uname = (user.username or "").lower()
    if ("pharmacy" in user_name or "pharmacy" in user_uname or "pharmacist" in user_name) and str(user.role).lower() != "pharmacy":
        user.role = UserRole.pharmacy

    user.last_login = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()

    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2-compatible token endpoint (form-encoded username/password) — used by Swagger UI
    and any OAuth2PasswordBearer-based client."""
    user = _authenticate(db, form_data.username, form_data.password)
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = create_access_token(subject=user.id, extra_claims={"role": role_str})
    return Token(access_token=token, user=user)


@router.post("/login-json", response_model=Token)
def login_json(payload: LoginRequest, db: Session = Depends(get_db)):
    """JSON login endpoint, convenient for the React frontend (email + password body)."""
    user = _authenticate(db, payload.email, payload.password)
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = create_access_token(subject=user.id, extra_claims={"role": role_str})
    return Token(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.get("/credentials", response_model=list[UserOut])
def list_login_credentials(db: Session = Depends(get_db)):
    """Public helper endpoint returning active registered user accounts in the DB
    with their branch details for quick login selection on portal login page."""
    users = db.scalars(select(User).where(User.is_active == True).order_by(User.created_at.desc())).all()
    return list(users)

