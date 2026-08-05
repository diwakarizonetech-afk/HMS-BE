from pydantic import BaseModel, Field, ConfigDict

from app.models.batch import BatchStatus, StoreActivityStatus
from app.models.store_item import ItemCategory
from app.schemas.common import TimestampedORMBase


class BatchItemBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    item_id: str | None = Field(None, alias="itemId")
    batch_number: str = Field(..., alias="batchNumber")
    item_code: str = Field(..., alias="itemCode")
    item_name: str = Field(..., alias="itemName")
    mfg_date: str | None = Field(None, alias="mfgDate")
    manufacturing_date: str | None = Field(None, alias="manufacturingDate")
    expiry_date: str = Field(..., alias="expiryDate")
    quantity: int = 0
    available_quantity: int = Field(0, alias="availableQuantity")
    expired_quantity: int = Field(0, alias="expiredQuantity")
    supplier_name: str | None = Field(None, alias="supplier")
    location: str | None = None


class BatchItemCreate(BatchItemBase):
    pass


class BatchItemUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    available_quantity: int | None = Field(None, alias="availableQuantity")
    expired_quantity: int | None = Field(None, alias="expiredQuantity")
    quantity: int | None = None
    supplier_name: str | None = Field(None, alias="supplier")
    location: str | None = None


class BatchItemOut(BatchItemBase, TimestampedORMBase):
    days_to_expiry: int = Field(0, alias="daysToExpiry")
    status: BatchStatus


class StoreActivityBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    activity: str
    item: str | None = None
    quantity: str | None = None
    user: str | None = None
    status: StoreActivityStatus = StoreActivityStatus.Completed


class StoreActivityCreate(StoreActivityBase):
    date: str | None = None


class StoreActivityOut(StoreActivityBase, TimestampedORMBase):
    date: str


class ReorderItemOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    item_code: str = Field(..., alias="itemCode")
    item_name: str = Field(..., alias="itemName")
    category: ItemCategory
    current_stock: int = Field(..., alias="currentStock")
    minimum_stock: int = Field(..., alias="minimumStock")
    reorder_level: int = Field(..., alias="reorderLevel")
    required_quantity: int = Field(..., alias="requiredQuantity")
    suggested_vendor: str | None = Field(None, alias="suggestedVendor")
    status: str
