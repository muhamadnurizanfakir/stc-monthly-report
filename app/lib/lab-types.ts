// Lab module types

export interface LabCompany {
  id: string;
  company_code: string;
  company_name: string;
  company_type: 'internal' | 'external';
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  is_active: boolean;
}

export interface LabUser {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: 'lab_admin' | 'lab_engineer' | 'lab_customer';
  company_id: string | null;
  employee_id: string | null;
  is_active: boolean;
  lab_companies?: LabCompany;
}

export interface LabTestCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface LabTestCatalogue {
  id: string;
  category_id: string;
  test_code: string;
  test_name: string;
  test_description: string | null;
  test_standard: string | null;
  unit_of_measure: string | null;
  typical_duration_days: number | null;
  base_price: number | null;
  currency: string;
  can_outsource: boolean;
  is_active: boolean;
  lab_test_categories?: LabTestCategory;
}

export interface LabRFQItem {
  id: string;
  rfq_id: string;
  test_catalogue_id: string | null;
  custom_test_name: string | null;
  test_description: string | null;
  sample_description: string | null;
  quantity: number;
  test_type: 'inhouse' | 'outsourced';
  special_requirements: string | null;
  sort_order: number;
  lab_test_catalogue?: LabTestCatalogue;
}

export interface LabRFQ {
  id: string;
  rfq_number: string;
  company_id: string | null;
  submitted_by: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  project_name: string;
  project_description: string | null;
  required_date: string | null;
  priority: 'urgent' | 'normal' | 'low';
  status: 'draft' | 'submitted' | 'under_review' | 'quoted' | 'approved' | 'rejected' | 'cancelled';
  remarks: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  lab_companies?: LabCompany;
  lab_rfq_items?: LabRFQItem[];
}

export interface LabQuotationItem {
  id: string;
  quotation_id: string;
  rfq_item_id: string | null;
  test_catalogue_id: string | null;
  description: string;
  test_type: 'inhouse' | 'outsourced';
  quantity: number;
  unit_price: number;
  total_price: number;
  estimated_days: number | null;
  sort_order: number;
}

export interface LabQuotation {
  id: string;
  quotation_number: string;
  rfq_id: string | null;
  company_id: string | null;
  valid_until: string | null;
  payment_terms: string;
  currency: string;
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  tax_pct: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  lab_rfq?: LabRFQ;
  lab_companies?: LabCompany;
  lab_quotation_items?: LabQuotationItem[];
}

export interface LabProject {
  id: string;
  project_number: string;
  rfq_id: string | null;
  quotation_id: string | null;
  company_id: string | null;
  project_name: string;
  project_description: string | null;
  start_date: string | null;
  target_completion: string | null;
  actual_completion: string | null;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'urgent' | 'normal' | 'low';
  notes: string | null;
  created_at: string;
  lab_companies?: LabCompany;
}

export interface LabSample {
  id: string;
  sample_number: string;
  project_id: string;
  sample_description: string;
  sample_condition: string | null;
  quantity_received: number;
  quantity_unit: string;
  received_date: string;
  storage_location: string | null;
  disposal_method: string | null;
  status: 'received' | 'in_test' | 'completed' | 'disposed';
  remarks: string | null;
  created_at: string;
  lab_projects?: LabProject;
}

export interface LabOutsourcedLab {
  id: string;
  lab_code: string;
  lab_name: string;
  accreditation: string | null;
  accreditation_no: string | null;
  accreditation_expiry: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface LabTestExecution {
  id: string;
  test_number: string;
  project_id: string;
  sample_id: string | null;
  test_name: string;
  test_type: 'inhouse' | 'outsourced';
  outsourced_lab_id: string | null;
  outsourced_cost: number | null;
  outsourced_ref: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  equipment_used: string | null;
  test_conditions: string | null;
  created_at: string;
  lab_projects?: LabProject;
  lab_outsourced_labs?: LabOutsourcedLab;
}

export interface LabReport {
  id: string;
  report_number: string;
  project_id: string;
  report_title: string;
  report_type: 'test' | 'summary' | 'calibration';
  status: 'draft' | 'under_review' | 'approved' | 'issued' | 'superseded';
  revision: string;
  file_url: string | null;
  summary: string | null;
  conclusion: string | null;
  issued_at: string | null;
  created_at: string;
  lab_projects?: LabProject;
}

export interface LabDocumentSummary {
  doc_type: string;
  doc_number: string;
  title: string;
  status: string;
  created_at: string;
  actioned_at: string | null;
  company_name: string | null;
  reference_id: string;
}

export interface LabAuditLog {
  id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_number: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}
