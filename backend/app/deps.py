from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_roles(*roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        role_norm = role_val.lower().replace(" ", "_").replace("userrole.", "")
        allowed_roles = [r.value if hasattr(r, "value") else str(r) for r in roles]
        allowed_norm = [a.lower().replace(" ", "_").replace("userrole.", "") for a in allowed_roles]

        if "store" in allowed_norm or "store_manager" in allowed_norm:
            allowed_norm.extend(["store", "store_manager"])

        if current_user.role not in roles and role_norm not in allowed_norm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_val}' is not permitted to perform this action",
            )
        return current_user

    return role_checker
