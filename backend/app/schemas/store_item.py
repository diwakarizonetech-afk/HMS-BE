from pydantic import BaseModel, Field, ConfigDict


from app.models.store_item import ItemCategory, ItemUnit, ItemStatus, PaymentTerms, VendorStatus
from app.schemas.common import TimestampedORMBase


class ItemMasterBase(BaseModel):
    item_code: str
    item_name: str
    category: ItemCategory
    sub_category: str | None = None
    unit: ItemUnit
    pack_quantity: int = 1
    issue_unit: str | None = "Piece"
    opening_stock: int = 0
    brand: str | None = None
    hsn_code: str | None = None
    gst_percentage: float = 0
    min_stock: int = 0
    max_stock: int = 0
    reorder_level: int = 0
    storage_location: str | None = None
    description: str | None = None
    unit_price: float = 0


class ItemMasterCreate(ItemMasterBase):
    status: ItemStatus = ItemStatus.Active
    current_stock: int = 0


class ItemMasterUpdate(BaseModel):
    item_name: str | None = None
    category: ItemCategory | None = None
    sub_category: str | None = None
    unit: ItemUnit | None = None
    pack_quantity: int | None = None
    issue_unit: str | None = None
    opening_stock: int | None = None
    brand: str | None = None
    hsn_code: str | None = None
    gst_percentage: float | None = None
    min_stock: int | None = None
    max_stock: int | None = None
    reorder_level: int | None = None
    storage_location: str | None = None
    description: str | None = None
    status: ItemStatus | None = None
    current_stock: int | None = None
    unit_price: float | None = None


class ItemMasterOut(ItemMasterBase, TimestampedORMBase):
    status: ItemStatus
    current_stock: int


class VendorBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    vendor_code: str = Field(..., alias="vendorCode")
    vendor_name: str = Field(..., alias="vendorName")
    category: str | None = "Pharmaceuticals"
    contact_person: str | None = Field(None, alias="contactPerson")
    mobile: str | None = Field(None, alias="phone")
    email: str | None = None
    gst_number: str | None = Field(None, alias="gstNumber")
    pan: str | None = None
    address: str | None = None
    city: str | None = "Bengaluru"
    state: str | None = "Karnataka"
    country: str | None = "India"
    payment_terms: PaymentTerms = Field(PaymentTerms.Net_30, alias="paymentTerms")
    rating: int | None = 5


class VendorCreate(VendorBase):
    status: VendorStatus = VendorStatus.Active


class VendorUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    vendor_name: str | None = Field(None, alias="vendorName")
    category: str | None = None
    contact_person: str | None = Field(None, alias="contactPerson")
    mobile: str | None = Field(None, alias="phone")
    email: str | None = None
    gst_number: str | None = Field(None, alias="gstNumber")
    pan: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    payment_terms: PaymentTerms | None = Field(None, alias="paymentTerms")
    rating: int | None = None
    status: VendorStatus | None = None


class VendorOut(VendorBase, TimestampedORMBase):
    status: VendorStatus

