from pydantic import BaseModel

from app.models.purchase_order import POStatus
from app.schemas.common import TimestampedORMBase


class POItemBase(BaseModel):
    item_id: str | None = None
    item_code: str
    item_name: str
    quantity: int
    unit_price: float
    discount: float = 0
    gst: float = 0


class POItemCreate(POItemBase):
    pass


class POItemOut(POItemBase, TimestampedORMBase):
    purchase_order_id: str
    total: float


class PurchaseOrderBase(BaseModel):
    vendor_id: str | None = None
    vendor_name: str
    purchase_date: str
    expected_delivery: str | None = None


class PurchaseOrderCreate(PurchaseOrderBase):
    po_number: str | None = None  # auto-generated if omitted
    created_date: str | None = None
    status: POStatus = POStatus.Draft
    items: list[POItemCreate] = []


class PurchaseOrderUpdate(BaseModel):
    vendor_id: str | None = None
    vendor_name: str | None = None
    purchase_date: str | None = None
    expected_delivery: str | None = None
    status: POStatus | None = None
    items: list[POItemCreate] | None = None  # if provided, replaces all line items


class PurchaseOrderOut(PurchaseOrderBase, TimestampedORMBase):
    po_number: str
    sub_total: float
    total_discount: float
    total_gst: float
    total_amount: float
    status: POStatus
    created_date: str
    items: list[POItemOut] = []
