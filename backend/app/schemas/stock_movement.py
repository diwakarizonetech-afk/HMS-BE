from pydantic import BaseModel, Field, ConfigDict

from app.models.stock_movement import TransferStatus, AdjustmentType
from app.schemas.common import TimestampedORMBase


class StockInwardBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    inward_number: str | None = Field(None, alias="inwardNumber")
    po_number: str | None = Field(None, alias="poNumber")
    item_id: str | None = Field(None, alias="itemId")
    item_code: str = Field("MED-001", alias="itemCode")
    item_name: str = Field("Item", alias="itemName")
    quantity: int = Field(1, gt=0)
    unit_price: float | None = Field(0.0, alias="unitPrice", ge=0)
    batch_number: str | None = Field(None, alias="batchNumber")
    expiry_date: str | None = Field(None, alias="expiryDate")
    supplier: str | None = None
    supplier_name: str | None = Field(None, alias="supplierName")
    warehouse: str | None = None
    received_by: str | None = Field(None, alias="receivedBy")


class StockInwardCreate(StockInwardBase):
    date: str | None = None


class StockInwardUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    po_number: str | None = Field(None, alias="poNumber")
    item_id: str | None = Field(None, alias="itemId")
    item_code: str | None = Field(None, alias="itemCode")
    item_name: str | None = Field(None, alias="itemName")
    quantity: int | None = Field(None, gt=0)
    unit_price: float | None = Field(None, alias="unitPrice")
    batch_number: str | None = Field(None, alias="batchNumber")
    expiry_date: str | None = Field(None, alias="expiryDate")
    supplier: str | None = None
    supplier_name: str | None = Field(None, alias="supplierName")
    warehouse: str | None = None
    received_by: str | None = Field(None, alias="receivedBy")
    date: str | None = None


class StockInwardOut(StockInwardBase, TimestampedORMBase):
    date: str


class StockOutwardBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    outward_number: str | None = Field(None, alias="outwardNumber")
    department: str = "General Ward"
    issued_to_department: str | None = Field(None, alias="issuedToDepartment")
    ward: str | None = None
    lab: str | None = None
    pharmacy: str | None = None
    operation_theatre: str | None = Field(None, alias="operationTheatre")
    doctor: str | None = None
    issued_to_person: str | None = Field(None, alias="issuedToPerson")
    reason: str | None = None
    item_id: str | None = Field(None, alias="itemId")
    item_code: str = Field("MED-001", alias="itemCode")
    item_name: str = Field("Item", alias="itemName")
    batch_number: str | None = Field(None, alias="batchNumber")
    quantity: int = Field(1, gt=0)
    issued_by: str | None = Field(None, alias="issuedBy")
    status: str | None = Field("Pending Approval", alias="status")


class StockOutwardCreate(StockOutwardBase):
    date: str | None = None


class StockOutwardOut(StockOutwardBase, TimestampedORMBase):
    date: str


class StockTransferBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    transfer_number: str | None = Field(None, alias="transferNumber")
    item_id: str | None = Field(None, alias="itemId")
    source: str = Field("Central Store Bay 1", alias="fromLocation")
    destination: str = Field("Pharmacy Store", alias="toLocation")
    from_location: str | None = Field(None, alias="from_location")
    to_location: str | None = Field(None, alias="to_location")
    item_code: str = Field("MED-001", alias="itemCode")
    item_name: str = Field("Item", alias="itemName")
    batch_number: str | None = Field(None, alias="batchNumber")
    quantity: int = Field(1, gt=0)
    requested_by: str | None = Field(None, alias="requestedBy")


class StockTransferCreate(StockTransferBase):
    transfer_date: str | None = Field(None, alias="transferDate")
    date: str | None = None
    status: TransferStatus = TransferStatus.Completed


class StockTransferUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    item_id: str | None = Field(None, alias="itemId")
    source: str | None = Field(None, alias="fromLocation")
    destination: str | None = Field(None, alias="toLocation")
    from_location: str | None = Field(None, alias="from_location")
    to_location: str | None = Field(None, alias="to_location")
    item_code: str | None = Field(None, alias="itemCode")
    item_name: str | None = Field(None, alias="itemName")
    batch_number: str | None = Field(None, alias="batchNumber")
    quantity: int | None = Field(None, gt=0)
    transfer_date: str | None = Field(None, alias="transferDate")
    date: str | None = None
    status: TransferStatus | None = None


class StockTransferOut(StockTransferBase, TimestampedORMBase):
    transfer_number: str = Field(..., alias="transferNumber")
    transfer_date: str = Field(..., alias="transferDate")
    status: TransferStatus


class StockAdjustmentBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    adjustment_number: str | None = Field(None, alias="adjustmentNumber")
    item_id: str | None = Field(None, alias="itemId")
    type: str = "Damage"
    item_code: str = Field("MED-001", alias="itemCode")
    item_name: str = Field("Item", alias="itemName")
    current_quantity: int = Field(0, alias="currentQuantity", ge=0)
    adjusted_quantity: int = Field(0, alias="adjustedQuantity", ge=0)
    reason: str | None = None
    approved_by: str | None = Field(None, alias="approvedBy")


class StockAdjustmentCreate(StockAdjustmentBase):
    date: str | None = None


class StockAdjustmentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    item_id: str | None = Field(None, alias="itemId")
    type: str | None = None
    item_code: str | None = Field(None, alias="itemCode")
    item_name: str | None = Field(None, alias="itemName")
    current_quantity: int | None = Field(None, alias="currentQuantity", ge=0)
    adjusted_quantity: int | None = Field(None, alias="adjustedQuantity", ge=0)
    reason: str | None = None
    approved_by: str | None = Field(None, alias="approvedBy")
    date: str | None = None


class StockAdjustmentOut(StockAdjustmentBase, TimestampedORMBase):
    date: str
