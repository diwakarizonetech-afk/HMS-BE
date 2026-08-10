from pydantic import BaseModel, Field

from app.models.goods_receipt import GRNStatus
from app.schemas.common import TimestampedORMBase


class GRNItemBase(BaseModel):
    item_id: str | None = None
    item_code: str
    item_name: str
    received_quantity: int = Field(..., gt=0)
    accepted_quantity: int = Field(..., ge=0)
    rejected_quantity: int = Field(0, ge=0)


class GRNItemCreate(GRNItemBase):
    pass


class GRNItemOut(GRNItemBase, TimestampedORMBase):
    goods_receipt_id: str


class GoodsReceiptBase(BaseModel):
    po_number: str | None = None
    purchase_order_id: str | None = None
    vendor_name: str
    received_date: str
    remarks: str | None = None


class GoodsReceiptCreate(GoodsReceiptBase):
    grn_number: str | None = None  # auto-generated if omitted
    status: GRNStatus = GRNStatus.Received
    items: list[GRNItemCreate] = []


class GoodsReceiptUpdate(BaseModel):
    remarks: str | None = None
    status: GRNStatus | None = None


class GoodsReceiptOut(GoodsReceiptBase, TimestampedORMBase):
    grn_number: str
    status: GRNStatus
    items: list[GRNItemOut] = []
