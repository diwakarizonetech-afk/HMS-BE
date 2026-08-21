export type BillType = 'OPD' | 'IPD' | 'Lab' | 'Pharmacy' | 'Procedure' | 'Other';

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue' | 'Refunded' | 'Cancelled';

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other';

export type ApprovalStatus = 'Pending' | 'Requested' | 'Approved' | 'Rejected' | 'Processed' | 'Cancelled';

export interface BillItem {
  id?: string;
  service_name: string;
  category?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  gross_amount: number;
  discount: number;
  tax: number;
  net_amount: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  patient_id?: string;
  patient_name: string;
  uhid: string;
  appointment_id?: string;
  ipd_number?: string;
  bill_type: BillType;
  department?: string;
  doctor_name?: string;
  gross_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_mode: PaymentMode | string;
  payment_status: PaymentStatus;
  discharge_status?: 'Advance' | 'Interim' | 'Final Discharge';
  bill_date: string;
  due_date?: string;
  billing_staff: string;
  branch: string;
  notes?: string;
  items: BillItem[];
}

export interface PaymentCollection {
  id?: string;
  receipt_number: string;
  bill_id?: string;
  bill_number: string;
  patient_name: string;
  uhid: string;
  service_type: string;
  total_bill: number;
  previously_paid: number;
  current_payment: number;
  remaining_due: number;
  payment_mode: PaymentMode;
  transaction_ref?: string;
  payer_name?: string;
  payer_identifier?: string;
  payer_contact?: string;
  payer_email?: string;
  gateway_payment_id?: string;
  gateway_order_id?: string;
  payment_date: string;
  collected_by: string;
  branch: string;
  notes?: string;
}

export interface DiscountRequest {
  id?: string;
  discount_code: string;
  bill_number: string;
  patient_name: string;
  uhid: string;
  original_amount: number;
  discount_type: 'Percentage' | 'Fixed Amount';
  discount_value: number;
  discount_amount: number;
  reason: string;
  requested_by: string;
  approved_by?: string;
  status: ApprovalStatus;
  request_date: string;
}

export interface RefundRequest {
  id?: string;
  refund_code: string;
  bill_number: string;
  patient_name: string;
  uhid: string;
  original_amount: number;
  paid_amount: number;
  refund_amount: number;
  refund_reason: string;
  refund_mode: PaymentMode;
  requested_by: string;
  approved_by?: string;
  refund_date: string;
  status: ApprovalStatus;
}

export interface BillCancellation {
  id?: string;
  cancellation_code: string;
  bill_number: string;
  patient_name: string;
  uhid: string;
  original_amount: number;
  cancellation_reason: string;
  requested_by: string;
  approved_by?: string;
  cancellation_date: string;
  status: ApprovalStatus;
}

export interface SupplierPayable {
  id?: string;
  supplier_name: string;
  invoice_number: string;
  purchase_date: string;
  invoice_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date?: string;
  payment_status: PaymentStatus;
  module_source: 'Pharmacy' | 'Store';
  branch: string;
}

export interface SupplierPayablesAnalytics {
  period: 'day' | 'month' | 'year' | string;
  start_date: string;
  end_date: string;
  totals: {
    purchase_value: number;
    payable_invoice_total: number;
    paid_total: number;
    outstanding_total: number;
    category_revenue_total: number;
    purchase_count: number;
    payable_count: number;
  };
  category_revenue: Array<{
    category: string;
    item_count: number;
    quantity_sold: number;
    revenue: number;
  }>;
  purchase_details: Array<{
    source: string;
    reference: string;
    invoice_number?: string;
    supplier_name: string;
    purchase_date: string;
    item_count: number;
    items: string;
    amount: number;
    branch?: string;
  }>;
  payables: SupplierPayable[];
  daily_summary: Array<{
    date: string;
    purchase_value: number;
    payable_value: number;
    revenue_value: number;
  }>;
}
export interface BillingAuditLog {
  id?: string;
  transaction_id: string;
  bill_number?: string;
  entity_type: 'Bill' | 'Payment' | 'Discount' | 'Refund' | 'Cancellation';
  action: 'Created' | 'Updated' | 'Approved' | 'Rejected' | 'Refunded' | 'Cancelled' | 'Collected' | 'Requested';
  previous_value?: string;
  new_value?: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  reason?: string;
}

export interface BillingKPIs {
  today_revenue: number;
  today_billing: number;
  today_collection: number;
  total_outstanding: number;
  today_refunds: number;
  today_discounts: number;
  opd_revenue: number;
  ipd_revenue: number;
  lab_revenue: number;
  pharmacy_revenue: number;
  procedure_revenue: number;
  total_revenue: number;
  total_expenses: number;
  net_revenue: number;
}

export interface CashierSummary {
  opening_cash: number;
  cash_collection: number;
  upi_collection: number;
  card_collection: number;
  bank_collection: number;
  other_collection: number;
  total_collection: number;
  refunds: number;
  net_cash: number;
  closing_cash: number;
  transaction_count: number;
}

