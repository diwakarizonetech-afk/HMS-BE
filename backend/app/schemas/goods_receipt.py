from pydantic import BaseModel, Field, ConfigDict

from app.models.goods_receipt import GRNStatus
from app.schemas.common import TimestampedORMBase


class GRNItemBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    item_id: str | None = Field(None, alias="itemId")
    item_code: str = Field("MED-001", alias="itemCode")
    item_name: str = Field("Item", alias="itemName")
    received_quantity: int = Field(0, alias="receivedQuantity", ge=0)
    accepted_quantity: int = Field(0, alias="acceptedQuantity", ge=0)
    rejected_quantity: int = Field(0, alias="rejectedQuantity", ge=0)


class GRNItemCreate(GRNItemBase):
    pass


class GRNItemOut(GRNItemBase, TimestampedORMBase):
    goods_receipt_id: str


class GoodsReceiptBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    po_number: str | None = Field(None, alias="poNumber")
    purchase_order_id: str | None = Field(None, alias="purchaseOrderId")
    po_id: str | None = Field(None, alias="poId")
    vendor_name: str = Field("General Supplier", alias="vendorName")
    received_date: str | None = Field(None, alias="receivedDate")
    remarks: str | None = None
    branch: str | None = None


class GoodsReceiptCreate(GoodsReceiptBase):
    grn_number: str | None = Field(None, alias="grnNumber")
    status: GRNStatus = GRNStatus.Received
    items: list[GRNItemCreate] = []


class GoodsReceiptUpdate(BaseModel):
    remarks: str | None = None
    status: GRNStatus | None = None


class GoodsReceiptOut(GoodsReceiptBase, TimestampedORMBase):
    grn_number: str
    status: GRNStatus
    items: list[GRNItemOut] = []
