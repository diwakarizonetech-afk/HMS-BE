import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session


def today_str() -> str:
    return date.today().isoformat()


def short_id() -> str:
    return uuid.uuid4().hex[:8].upper()


def get_or_404(db: Session, model, obj_id: str, name: str = "Resource"):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{name} not found")
    return obj


def list_all(db: Session, model, skip: int = 0, limit: int = 100, order_by=None):
    stmt = select(model)
    if order_by is not None:
        stmt = stmt.order_by(order_by)
    stmt = stmt.offset(skip).limit(limit)
    return db.scalars(stmt).all()


def apply_updates(obj, payload) -> None:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
