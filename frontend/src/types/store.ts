export type ItemCategory =
  | 'Antibiotics'
  | 'Pain Management'
  | 'Cardiovascular'
  | 'Diabetes'
  | 'Respiratory'
  | 'Gastrointestinal'
  | 'Allergy'
  | 'Antifungal'
  | 'Antiviral'
  | 'Vitamins & Supplements'
  | 'Vaccines'
  | 'Emergency Medicines'
  | 'IV Fluids'
  | 'Topical Medicines'
  | 'Steroids'
  | 'Pharmaceuticals'
  | 'Surgical Supplies'
  | 'Laboratory Supplies'
  | 'Lab Reagents'
  | 'Medical Equipment'
  | 'PPE & Safety'
  | 'Cleaning Supplies'
  | 'Office & Stationery'
  | 'Patient Care Supplies'
  | 'Consumables'
  | 'General Store'
  | string;

export const MEDICINE_CATEGORIES: string[] = [
  'Antibiotics',
  'Pain Management',
  'Cardiovascular',
  'Diabetes',
  'Respiratory',
  'Gastrointestinal',
  'Allergy',
  'Antifungal',
  'Antiviral',
  'Vitamins & Supplements',
  'Vaccines',
  'Emergency Medicines',
  'IV Fluids',
  'Topical Medicines',
  'Steroids',
  'Pharmaceuticals',
];

export const OTHER_HOSPITAL_CATEGORIES: string[] = [
  'Surgical Supplies',
  'Laboratory Supplies',
  'Lab Reagents',
  'Medical Equipment',
  'PPE & Safety',
  'Cleaning Supplies',
  'Office & Stationery',
  'Patient Care Supplies',
  'Consumables',
  'General Store',
];

export type ItemUnit = 'Box' | 'Strip' | 'Bottle' | 'Vial' | 'Piece' | 'Pack' | 'Roll' | 'Set';

export interface ItemMaster {
  id: string;
  itemCode: string;
  itemName: string;
  category: ItemCategory;
  subCategory: string;
  genericComposition?: string; // e.g. Glimepiride + Metformin
  strength?: string; // e.g. 2 mg + 500 mg
  dosageForm?: string; // e.g. Tablet, Syrup, Injection
  unit: ItemUnit;
  packQuantity?: number; // e.g., 20 (20 items inside 1 Box/Strip)
  issueUnit?: string; // e.g., 'Piece', 'Tablet', 'Capsule', 'Vial'
  openingStock?: number; // Initial stock on hand (e.g. 10 Boxes)
  brand: string;
  hsnCode: string;
  gstPercentage: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  storageLocation: string;
  description: string;
  status: 'Active' | 'Inactive';
  currentStock: number; // Available inventory stock
  unitPrice: number;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  category?: string;
  contactPerson: string;
  mobile: string;
  email: string;
  gstNumber: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  country: string;
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 60' | 'Advance' | 'COD';
  status: 'Active' | 'Inactive';
}

export interface POItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  category?: string;
  genericComposition?: string;
  strength?: string;
  dosageForm?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gst: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  purchaseDate: string;
  expectedDelivery: string;
  items: POItem[];
  subTotal: number;
  totalDiscount: number;
  totalGst: number;
  totalAmount: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';
  createdDate: string;
}

export interface GRNItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  receivedDate: string;
  items: GRNItem[];
  remarks: string;
  status: 'Received' | 'Verified' | 'Completed';
}

export interface StockInward {
  id: string;
  inwardNumber?: string;
  poNumber?: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice?: number;
  batchNumber?: string;
  expiryDate?: string;
  supplier?: string;
  warehouse?: string;
  receivedBy?: string;
  date: string;
}

export interface StockOutward {
  id: string;
  outwardNumber?: string;
  department: string;
  ward?: string;
  lab?: string;
  pharmacy?: string;
  operationTheatre?: string;
  doctor?: string;
  receivedBy?: string;
  reason: string;
  itemCode: string;
  itemName: string;
  batchNumber?: string;
  quantity: number;
  issuedBy?: string;
  date: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  source: string;
  destination: string;
  itemCode: string;
  itemName: string;
  batchNumber?: string;
  quantity: number;
  transferDate: string;
  date?: string;
  status: 'Pending' | 'In Transit' | 'Completed' | 'Cancelled';
  requestedBy?: string;
}

export type AdjustmentType = 'Damage' | 'Lost' | 'Expired' | 'Manual Correction';

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  type: AdjustmentType;
  itemCode: string;
  itemName: string;
  currentQuantity: number;
  adjustedQuantity: number;
  reason: string;
  approvedBy: string;
  date: string;
}

export interface ReorderItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: ItemCategory;
  currentStock: number;
  minimumStock?: number;
  minStock?: number;
  maxStock?: number;
  reorderLevel: number;
  requiredQuantity: number;
  unit?: ItemUnit | string;
  suggestedVendor?: string;
  urgency?: 'Critical' | 'Moderate' | string;
  status: 'Pending' | 'PO Created' | 'Critical' | 'Reorder Warning' | 'Normal' | string;
}

export interface BatchItem {
  id: string;
  itemId?: string;
  batchNumber: string;
  itemCode: string;
  itemName: string;
  mfgDate: string;
  expiryDate: string;
  availableQuantity?: number;
  expiredQuantity?: number;
  daysToExpiry?: number;
  status: 'Expired' | 'Near Expiry' | 'Normal';
  supplier?: string;
  location?: string;
  quantity?: number;
}

export interface StoreActivity {
  id: string;
  date: string;
  activity: string;
  item: string;
  quantity: string;
  user: string;
  status: 'Completed' | 'Pending' | 'Approved' | 'In Progress' | 'Alert';
}