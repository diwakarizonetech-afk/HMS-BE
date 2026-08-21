from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.models.store_item import ItemCategory, ItemUnit, ItemStatus, PaymentTerms, VendorStatus
from app.schemas.common import TimestampedORMBase


def normalize_category(v) -> ItemCategory:
    if not v:
        return ItemCategory.Pharmaceuticals
    v_str = str(getattr(v, "value", v)).strip()
    for cat in ItemCategory:
        if cat.value.lower() == v_str.lower():
            return cat
    med_cats = [
        "antibiotics", "pain management", "cardiovascular", "diabetes", "respiratory",
        "gastrointestinal", "allergy", "antifungal", "antiviral", "vitamins",
        "vaccines", "emergency medicines", "iv fluids", "topical", "steroids", "pharmaceuticals"
    ]
    if any(m in v_str.lower() for m in med_cats):
        return ItemCategory.Pharmaceuticals
    if "surgical" in v_str.lower():
        return ItemCategory.Surgical_Supplies
    if "reagent" in v_str.lower() or "lab" in v_str.lower():
        return ItemCategory.Lab_Reagents
    if "equipment" in v_str.lower():
        return ItemCategory.Medical_Equipment
    if "consumable" in v_str.lower() or "ppe" in v_str.lower() or "safety" in v_str.lower() or "patient care" in v_str.lower():
        return ItemCategory.Consumables
    return ItemCategory.General_Store


def normalize_unit(v) -> ItemUnit:
    if not v:
        return ItemUnit.Box
    v_str = str(getattr(v, "value", v)).strip()
    for u in ItemUnit:
        if u.value.lower() == v_str.lower():
            return u
    if "strip" in v_str.lower():
        return ItemUnit.Strip
    if "bottle" in v_str.lower():
        return ItemUnit.Bottle
    if "vial" in v_str.lower() or "ampoule" in v_str.lower() or "injection" in v_str.lower():
        return ItemUnit.Vial
    if "pack" in v_str.lower():
        return ItemUnit.Pack
    if "roll" in v_str.lower():
        return ItemUnit.Roll
    if "set" in v_str.lower():
        return ItemUnit.Set
    if "box" in v_str.lower():
        return ItemUnit.Box
    return ItemUnit.Piece


class ItemMasterBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    item_code: str = Field(..., alias="itemCode")
    item_name: str = Field(..., alias="itemName")
    category: ItemCategory
    sub_category: str | None = Field(None, alias="subCategory")
    generic_composition: str | None = Field(None, alias="genericComposition")
    strength: str | None = None
    dosage_form: str | None = Field(None, alias="dosageForm")
    unit: ItemUnit
    pack_quantity: int = Field(1, alias="packQuantity")
    issue_unit: str | None = Field("Piece", alias="issueUnit")
    opening_stock: int = Field(0, alias="openingStock")
    brand: str | None = None
    hsn_code: str | None = Field(None, alias="hsnCode")
    gst_percentage: float = Field(0, alias="gstPercentage")
    min_stock: int = Field(0, alias="minStock")
    max_stock: int = Field(0, alias="maxStock")
    reorder_level: int = Field(0, alias="reorderLevel")
    storage_location: str | None = Field(None, alias="storageLocation")
    description: str | None = None
    unit_price: float = Field(0, alias="unitPrice")

    @field_validator("category", mode="before")
    @classmethod
    def validate_category(cls, v):
        return normalize_category(v)

    @field_validator("unit", mode="before")
    @classmethod
    def validate_unit(cls, v):
        return normalize_unit(v)


class ItemMasterCreate(ItemMasterBase):
    status: ItemStatus = ItemStatus.Active
    current_stock: int = Field(0, alias="currentStock")


class ItemMasterUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    item_code: str | None = Field(None, alias="itemCode")
    item_name: str | None = Field(None, alias="itemName")
    category: ItemCategory | None = None
    sub_category: str | None = Field(None, alias="subCategory")
    generic_composition: str | None = Field(None, alias="genericComposition")
    strength: str | None = None
    dosage_form: str | None = Field(None, alias="dosageForm")
    unit: ItemUnit | None = None
    pack_quantity: int | None = Field(None, alias="packQuantity")
    issue_unit: str | None = Field(None, alias="issueUnit")
    opening_stock: int | None = Field(None, alias="openingStock")
    brand: str | None = None
    hsn_code: str | None = Field(None, alias="hsnCode")
    gst_percentage: float | None = Field(None, alias="gstPercentage")
    min_stock: int | None = Field(None, alias="minStock")
    max_stock: int | None = Field(None, alias="maxStock")
    reorder_level: int | None = Field(None, alias="reorderLevel")
    storage_location: str | None = Field(None, alias="storageLocation")
    description: str | None = None
    status: ItemStatus | None = None
    current_stock: int | None = Field(None, alias="currentStock")
    unit_price: float | None = Field(None, alias="unitPrice")

    @field_validator("category", mode="before")
    @classmethod
    def validate_category(cls, v):
        if v is None:
            return None
        return normalize_category(v)

    @field_validator("unit", mode="before")
    @classmethod
    def validate_unit(cls, v):
        if v is None:
            return None
        return normalize_unit(v)


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

