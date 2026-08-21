CREATE DATABASE IF NOT EXISTS construction_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE construction_erp;

SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS companies (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  pan_vat_no VARCHAR(50), phone VARCHAR(50), email VARCHAR(150), address VARCHAR(255), logo VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS company_settings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL UNIQUE,
  vat_enabled TINYINT(1) DEFAULT 1, vat_rate DECIMAL(6,2) DEFAULT 13.00, currency VARCHAR(10) DEFAULT 'NPR',
  invoice_prefix VARCHAR(20) DEFAULT 'INV', quotation_prefix VARCHAR(20) DEFAULT 'QT', project_prefix VARCHAR(20) DEFAULT 'PRJ', receipt_prefix VARCHAR(20) DEFAULT 'RCPT',
  stamp_file VARCHAR(255), signature_file VARCHAR(255), language VARCHAR(10) DEFAULT 'en', timezone VARCHAR(50) DEFAULT 'Asia/Kathmandu',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_settings_company FOREIGN KEY(company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fiscal_years (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, code VARCHAR(20) NOT NULL, name VARCHAR(80),
  start_date DATE, end_date DATE, is_current TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fy_company_code(company_id,code), FOREIGN KEY(company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, name VARCHAR(80) NOT NULL, description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_role_company_name(company_id,name), FOREIGN KEY(company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(100) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, description VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL, permission_id BIGINT UNSIGNED NOT NULL, PRIMARY KEY(role_id,permission_id),
  FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE, FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, role_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL, email VARCHAR(150) NOT NULL UNIQUE, phone VARCHAR(50), password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clients (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, name VARCHAR(180) NOT NULL, contact_person VARCHAR(150),
  phone VARCHAR(50), email VARCHAR(150), address VARCHAR(255), pan_vat_no VARCHAR(50), notes TEXT,
  created_by BIGINT UNSIGNED, updated_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clients_company(company_id), FOREIGN KEY(company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, fiscal_year_id BIGINT UNSIGNED,
  project_code VARCHAR(50) NOT NULL, project_name VARCHAR(180) NOT NULL, client_id BIGINT UNSIGNED, location VARCHAR(255), description TEXT,
  start_date_ad DATE, start_date_bs VARCHAR(20), end_date_ad DATE, end_date_bs VARCHAR(20), contract_amount DECIMAL(18,2) DEFAULT 0, estimated_cost DECIMAL(18,2) DEFAULT 0,
  project_manager_id BIGINT UNSIGNED, status ENUM('Planning','Running','On Hold','Completed','Cancelled') DEFAULT 'Planning', progress_percentage DECIMAL(6,2) DEFAULT 0,
  billing_amount DECIMAL(18,2) DEFAULT 0, received_amount DECIMAL(18,2) DEFAULT 0, outstanding_amount DECIMAL(18,2) DEFAULT 0,
  material_cost DECIMAL(18,2) DEFAULT 0, labour_cost DECIMAL(18,2) DEFAULT 0, other_cost DECIMAL(18,2) DEFAULT 0, total_expense DECIMAL(18,2) DEFAULT 0,
  gross_profit DECIMAL(18,2) DEFAULT 0, net_profit DECIMAL(18,2) DEFAULT 0,
  created_by BIGINT UNSIGNED, updated_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_code(company_id,project_code), INDEX idx_project_status(company_id,status),
  FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(client_id) REFERENCES clients(id), FOREIGN KEY(project_manager_id) REFERENCES users(id), FOREIGN KEY(fiscal_year_id) REFERENCES fiscal_years(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_members (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL, role_on_project VARCHAR(100),
  created_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_project_member(project_id,user_id), FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_stages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED NOT NULL, stage_name VARCHAR(150) NOT NULL,
  weight_percentage DECIMAL(6,2) DEFAULT 0, sort_order INT DEFAULT 0, start_date DATE, expected_end_date DATE, actual_end_date DATE,
  status ENUM('Not Started','Running','Completed','On Hold') DEFAULT 'Not Started', progress_percentage DECIMAL(6,2) DEFAULT 0, engineer_remarks TEXT,
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id), INDEX idx_stage_project(project_id,sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_progress (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED NOT NULL, stage_id BIGINT UNSIGNED,
  progress_date DATE NOT NULL, progress_percentage DECIMAL(6,2) DEFAULT 0, remarks TEXT, created_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(stage_id) REFERENCES project_stages(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_daily_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED NOT NULL, log_date DATE NOT NULL,
  weather VARCHAR(100), today_work TEXT, worker_count INT DEFAULT 0, materials_used TEXT, equipment_used TEXT, work_progress DECIMAL(6,2) DEFAULT 0,
  problems_delays TEXT, tomorrow_plan TEXT, engineer_remarks TEXT, created_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_documents (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED NOT NULL, document_type VARCHAR(100), title VARCHAR(180), file_path VARCHAR(255), created_by BIGINT UNSIGNED,
  is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_photos (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED NOT NULL, stage_id BIGINT UNSIGNED,
  photo_type ENUM('Before','Progress','After','Other') DEFAULT 'Progress', file_path VARCHAR(255) NOT NULL, caption VARCHAR(255), photo_date DATE, created_by BIGINT UNSIGNED,
  is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, fiscal_year_id BIGINT UNSIGNED, quotation_no VARCHAR(50) NOT NULL,
  quotation_date DATE NOT NULL, client_id BIGINT UNSIGNED, title VARCHAR(180), subtotal DECIMAL(18,2) DEFAULT 0, discount DECIMAL(18,2) DEFAULT 0,
  taxable_amount DECIMAL(18,2) DEFAULT 0, vat_rate DECIMAL(6,2) DEFAULT 0, vat_amount DECIMAL(18,2) DEFAULT 0, grand_total DECIMAL(18,2) DEFAULT 0,
  status ENUM('Draft','Sent','Approved','Rejected','Expired','Converted') DEFAULT 'Draft', valid_until DATE, notes TEXT, approved_by BIGINT UNSIGNED, approved_at DATETIME,
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quotation_no(company_id,quotation_no), FOREIGN KEY(client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotation_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, quotation_id BIGINT UNSIGNED NOT NULL, category VARCHAR(120), description VARCHAR(255) NOT NULL,
  unit VARCHAR(30), quantity DECIMAL(18,3) DEFAULT 0, rate DECIMAL(18,2) DEFAULT 0, amount DECIMAL(18,2) DEFAULT 0, sort_order INT DEFAULT 0,
  FOREIGN KEY(quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS boqs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED, quotation_id BIGINT UNSIGNED, boq_no VARCHAR(50), title VARCHAR(180), status ENUM('Draft','Approved','Locked') DEFAULT 'Draft',
  total_amount DECIMAL(18,2) DEFAULT 0, created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(quotation_id) REFERENCES quotations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS boq_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, boq_id BIGINT UNSIGNED NOT NULL, category VARCHAR(120), description VARCHAR(255) NOT NULL,
  unit VARCHAR(30), quantity DECIMAL(18,3) DEFAULT 0, rate DECIMAL(18,2) DEFAULT 0, amount DECIMAL(18,2) DEFAULT 0, completed_qty DECIMAL(18,3) DEFAULT 0,
  remaining_qty DECIMAL(18,3) DEFAULT 0, completion_percentage DECIMAL(6,2) DEFAULT 0, sort_order INT DEFAULT 0, FOREIGN KEY(boq_id) REFERENCES boqs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, name VARCHAR(180) NOT NULL, contact_person VARCHAR(150), phone VARCHAR(50), email VARCHAR(150), address VARCHAR(255), pan_vat_no VARCHAR(50), opening_due DECIMAL(18,2) DEFAULT 0, notes TEXT,
  created_by BIGINT UNSIGNED, updated_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_categories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, name VARCHAR(120) NOT NULL, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_material_category(company_id,name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS materials (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, category_id BIGINT UNSIGNED, name VARCHAR(180) NOT NULL, sku VARCHAR(80), unit VARCHAR(30) NOT NULL,
  opening_stock DECIMAL(18,3) DEFAULT 0, minimum_stock DECIMAL(18,3) DEFAULT 0, default_unit_cost DECIMAL(18,2) DEFAULT 0, notes TEXT,
  created_by BIGINT UNSIGNED, updated_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES material_categories(id), UNIQUE KEY uq_material_sku(company_id,sku)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_purchases (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, fiscal_year_id BIGINT UNSIGNED, supplier_id BIGINT UNSIGNED, project_id BIGINT UNSIGNED,
  purchase_no VARCHAR(50), purchase_date DATE NOT NULL, invoice_ref VARCHAR(100), subtotal DECIMAL(18,2) DEFAULT 0, vat_amount DECIMAL(18,2) DEFAULT 0, grand_total DECIMAL(18,2) DEFAULT 0, paid_amount DECIMAL(18,2) DEFAULT 0, due_amount DECIMAL(18,2) DEFAULT 0,
  status ENUM('Draft','Posted','Cancelled') DEFAULT 'Posted', bill_file VARCHAR(255), remarks TEXT, created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id), FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_purchase_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, material_purchase_id BIGINT UNSIGNED NOT NULL, material_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(18,3) NOT NULL, unit_cost DECIMAL(18,2) NOT NULL, amount DECIMAL(18,2) NOT NULL, FOREIGN KEY(material_purchase_id) REFERENCES material_purchases(id) ON DELETE CASCADE, FOREIGN KEY(material_id) REFERENCES materials(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_issues (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED NOT NULL, issue_date DATE NOT NULL, remarks TEXT, created_by BIGINT UNSIGNED,
  is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_issue_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, material_issue_id BIGINT UNSIGNED NOT NULL, material_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(18,3) NOT NULL, unit_cost DECIMAL(18,2) DEFAULT 0, FOREIGN KEY(material_issue_id) REFERENCES material_issues(id) ON DELETE CASCADE, FOREIGN KEY(material_id) REFERENCES materials(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_transactions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, material_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED,
  transaction_date DATE NOT NULL, transaction_type ENUM('Purchase','Issue','Transfer In','Transfer Out','Damage','Wastage','Adjustment In','Adjustment Out') NOT NULL,
  quantity DECIMAL(18,3) NOT NULL, unit_cost DECIMAL(18,2) DEFAULT 0, reference_type VARCHAR(80), reference_id BIGINT UNSIGNED, remarks VARCHAR(255), created_by BIGINT UNSIGNED,
  is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(material_id) REFERENCES materials(id), FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, employee_code VARCHAR(50), name VARCHAR(180) NOT NULL,
  employee_type ENUM('Employee','Labour') DEFAULT 'Employee', designation VARCHAR(100), phone VARCHAR(50), email VARCHAR(150), address VARCHAR(255), join_date DATE,
  salary_type ENUM('Monthly','Daily') DEFAULT 'Monthly', basic_salary DECIMAL(18,2) DEFAULT 0, daily_wage DECIMAL(18,2) DEFAULT 0, is_active TINYINT(1) DEFAULT 1,
  created_by BIGINT UNSIGNED, updated_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employee_code(company_id,employee_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS labours (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL, labour_type ENUM('Mistri','Helper','Engineer','Supervisor','Other') DEFAULT 'Other', skill VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED,
  attendance_date DATE NOT NULL, status ENUM('Present','Absent','Half Day','Leave','Holiday','Site Visit') NOT NULL,
  check_in TIME, check_out TIME, regular_hours DECIMAL(6,2) DEFAULT 0, overtime_hours DECIMAL(6,2) DEFAULT 0, daily_wage DECIMAL(18,2) DEFAULT 0, calculated_amount DECIMAL(18,2) DEFAULT 0, remarks VARCHAR(255),
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance(company_id,employee_id,attendance_date), FOREIGN KEY(employee_id) REFERENCES employees(id), FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employee_advances (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL, advance_date DATE NOT NULL, amount DECIMAL(18,2) NOT NULL, remarks VARCHAR(255), recovered_amount DECIMAL(18,2) DEFAULT 0,
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS salary_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL, fiscal_year_id BIGINT UNSIGNED,
  salary_month VARCHAR(20) NOT NULL, basic_salary DECIMAL(18,2) DEFAULT 0, attendance_days DECIMAL(6,2) DEFAULT 0, overtime_amount DECIMAL(18,2) DEFAULT 0, bonus DECIMAL(18,2) DEFAULT 0, allowance DECIMAL(18,2) DEFAULT 0,
  advance_deduction DECIMAL(18,2) DEFAULT 0, other_deduction DECIMAL(18,2) DEFAULT 0, net_salary DECIMAL(18,2) DEFAULT 0, status ENUM('Draft','Processed','Paid') DEFAULT 'Draft', paid_date DATE,
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_salary(company_id,employee_id,salary_month), FOREIGN KEY(employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expense_categories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, name VARCHAR(120) NOT NULL, expense_type VARCHAR(50), is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_expense_category(company_id,name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED, fiscal_year_id BIGINT UNSIGNED, category_id BIGINT UNSIGNED,
  expense_date DATE NOT NULL, expense_type ENUM('Material','Labour','Transport','Fuel','Equipment','Food','Office','Miscellaneous','Other') NOT NULL, description VARCHAR(255), amount DECIMAL(18,2) NOT NULL,
  payment_method VARCHAR(50), reference_no VARCHAR(100), bill_file VARCHAR(255), approved_by BIGINT UNSIGNED, approved_at DATETIME,
  created_by BIGINT UNSIGNED, updated_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(category_id) REFERENCES expense_categories(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, fiscal_year_id BIGINT UNSIGNED, invoice_no VARCHAR(50) NOT NULL, invoice_date DATE NOT NULL,
  client_id BIGINT UNSIGNED, project_id BIGINT UNSIGNED, pan_vat_no VARCHAR(50), subtotal DECIMAL(18,2) DEFAULT 0, discount DECIMAL(18,2) DEFAULT 0, taxable_amount DECIMAL(18,2) DEFAULT 0,
  vat_rate DECIMAL(6,2) DEFAULT 0, vat_amount DECIMAL(18,2) DEFAULT 0, grand_total DECIMAL(18,2) DEFAULT 0, paid_amount DECIMAL(18,2) DEFAULT 0, due_amount DECIMAL(18,2) DEFAULT 0,
  status ENUM('Draft','Issued','Partially Paid','Paid','Overdue','Cancelled') DEFAULT 'Draft', due_date DATE, notes TEXT,
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoice_no(company_id,invoice_no), FOREIGN KEY(client_id) REFERENCES clients(id), FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, invoice_id BIGINT UNSIGNED NOT NULL, description VARCHAR(255) NOT NULL, unit VARCHAR(30), quantity DECIMAL(18,3) DEFAULT 0, rate DECIMAL(18,2) DEFAULT 0, amount DECIMAL(18,2) DEFAULT 0,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, fiscal_year_id BIGINT UNSIGNED, receipt_no VARCHAR(50) NOT NULL, payment_date DATE NOT NULL,
  client_id BIGINT UNSIGNED, project_id BIGINT UNSIGNED, invoice_id BIGINT UNSIGNED, amount DECIMAL(18,2) NOT NULL, payment_method VARCHAR(50), reference_no VARCHAR(100), status ENUM('Pending','Successful','Failed','Refunded') DEFAULT 'Successful', remarks TEXT,
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_receipt_no(company_id,receipt_no), FOREIGN KEY(client_id) REFERENCES clients(id), FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(invoice_id) REFERENCES invoices(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_receipts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, payment_id BIGINT UNSIGNED NOT NULL, receipt_file VARCHAR(255), generated_at DATETIME DEFAULT CURRENT_TIMESTAMP, generated_by BIGINT UNSIGNED,
  FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, equipment_code VARCHAR(50), name VARCHAR(180) NOT NULL, type VARCHAR(100), purchase_cost DECIMAL(18,2) DEFAULT 0, current_value DECIMAL(18,2) DEFAULT 0,
  status ENUM('Available','Assigned','On Site','Rented Out','Maintenance','Damaged','Inactive') DEFAULT 'Available', notes TEXT,
  created_by BIGINT UNSIGNED, updated_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME, deleted_by BIGINT UNSIGNED, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_equipment_code(company_id,equipment_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_assignments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, equipment_id BIGINT UNSIGNED NOT NULL, project_id BIGINT UNSIGNED NOT NULL, assigned_date DATE NOT NULL, returned_date DATE,
  fuel_cost DECIMAL(18,2) DEFAULT 0, remarks TEXT, created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(equipment_id) REFERENCES equipment(id), FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, equipment_id BIGINT UNSIGNED NOT NULL, maintenance_date DATE NOT NULL, description TEXT, cost DECIMAL(18,2) DEFAULT 0, next_service_date DATE,
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(equipment_id) REFERENCES equipment(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_rentals (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, equipment_id BIGINT UNSIGNED NOT NULL, customer_name VARCHAR(180), start_date DATE, end_date DATE, rental_income DECIMAL(18,2) DEFAULT 0, rental_expense DECIMAL(18,2) DEFAULT 0, status VARCHAR(50),
  created_by BIGINT UNSIGNED, is_deleted TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(equipment_id) REFERENCES equipment(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED, type VARCHAR(80), title VARCHAR(180) NOT NULL, message TEXT, entity_type VARCHAR(80), entity_id BIGINT UNSIGNED,
  is_read TINYINT(1) DEFAULT 0, read_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, company_id BIGINT UNSIGNED, user_id BIGINT UNSIGNED, action VARCHAR(80) NOT NULL, entity_type VARCHAR(100), entity_id BIGINT UNSIGNED,
  ip_address VARCHAR(64), user_agent VARCHAR(255), metadata JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_company(company_id,created_at), FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS=1;
