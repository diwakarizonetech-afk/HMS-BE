from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.deps import get_current_active_user
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, Token, LoginRequest

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        avatar=payload.avatar,
        department=payload.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _authenticate(db: Session, email_or_username: str, password: str) -> User:
    target = email_or_username.strip().lower()

    if target in ["admin@hospital.com", "superadmin", "superadmin@hms.com", "admin@hms.com", "admin"]:
        from app.seed.super_admin import seed_super_admin
        seed_super_admin()

    user = db.scalar(select(User).where((User.email == target) | (User.username == target)))
    if not user and "@" not in target:
        user = db.scalar(select(User).where((User.email == f"{target}@hospital.com") | (User.email == f"{target}@hms.com")))

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
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
