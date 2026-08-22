import 'dotenv/config';

const BASE = `http://localhost:${process.env.PORT || 5000}/api`;
let TOKEN = '';

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

async function run() {
  console.log('Logging in...');
  const login = await call('POST', '/auth/login', { email: 'admin@construction.local', password: 'Admin@123' });
  TOKEN = login.token;

  console.log('Creating clients...');
  const clientDefs = [
    ['Shree Kumar', 'Kumar Sharma', '9800000001', 'shreekumar@gmail.com', 'Kathmandu'],
    ['Green Pvt. Ltd.', 'Rajan Shrestha', '9800000002', 'info@green.com.np', 'Lalitpur'],
    ['Pokhara Hotel Pvt. Ltd.', 'Suman Thapa', '9800000003', 'info@pokharahotel.com', 'Pokhara'],
    ['Butwal Traders', 'Hari Prasad', '9800000004', 'butwaltraders@gmail.com', 'Butwal'],
    ['Rajesh Patel', 'Rajesh Patel', '9800000005', 'rajeshpatel@gmail.com', 'Jhapa'],
  ];
  const clients = [];
  for (const [name, contact_person, phone, email, address] of clientDefs) {
    clients.push(await call('POST', '/clients', { name, contact_person, phone, email, address, pan_vat_no: '' }));
  }

  console.log('Creating suppliers...');
  const suppliers = [];
  suppliers.push(await call('POST', '/suppliers', { name: 'Kathmandu Cement Suppliers', contact_person: 'Bikram Karki', phone: '9811111111', address: 'Kathmandu', opening_due: 25000 }));
  suppliers.push(await call('POST', '/suppliers', { name: 'Everest Steel Traders', contact_person: 'Dipesh Rai', phone: '9822222222', address: 'Kathmandu', opening_due: 0 }));
  suppliers.push(await call('POST', '/suppliers', { name: 'Valley Hardware Store', contact_person: 'Anup Shah', phone: '9833333333', address: 'Lalitpur', opening_due: 8000 }));

  console.log('Creating materials...');
  const materialDefs = [
    ['Cement (OPC)', 'MAT-CEM', 'Bag', 500, 100, 520],
    ['Sand', 'MAT-SND', 'Cft', 400, 200, 80],
    ['Aggregate 20mm', 'MAT-AGG', 'Cft', 300, 150, 90],
    ['Bricks (1st Class)', 'MAT-BRK', 'Piece', 5000, 1000, 9],
    ['Steel (12mm)', 'MAT-STL', 'Kg', 800, 300, 90],
    ['Paint', 'MAT-PNT', 'Litre', 60, 20, 350],
    ['PVC Pipe', 'MAT-PVC', 'Piece', 100, 30, 220],
    ['Electrical Wire', 'MAT-WIR', 'Coil', 40, 10, 1800],
  ];
  const materials = [];
  for (const [name, sku, unit, opening_stock, minimum_stock, default_unit_cost] of materialDefs) {
    materials.push(await call('POST', '/materials', { name, sku, unit, opening_stock, minimum_stock, default_unit_cost }));
  }

  console.log('Creating employees...');
  const employeeDefs = [
    ['EMP-001', 'Ram Bahadur', 'Labour', 'Mistri', 'Daily', 0, 1500],
    ['EMP-002', 'Hari Prasad', 'Labour', 'Helper', 'Daily', 0, 1000],
    ['EMP-003', 'Suman Thapa', 'Employee', 'Engineer', 'Monthly', 45000, 0],
    ['EMP-004', 'Bikash Yadav', 'Employee', 'Supervisor', 'Monthly', 32000, 0],
    ['EMP-005', 'Raju Khatri', 'Labour', 'Helper', 'Daily', 0, 1000],
    ['EMP-006', 'Kamal Gurung', 'Labour', 'Mistri', 'Daily', 0, 1500],
    ['EMP-007', 'Sita Rai', 'Employee', 'Site Supervisor', 'Monthly', 30000, 0],
    ['EMP-008', 'Deepak Shrestha', 'Labour', 'Helper', 'Daily', 0, 1000],
  ];
  const employees = [];
  for (const [employee_code, name, employee_type, designation, salary_type, basic_salary, daily_wage] of employeeDefs) {
    employees.push(await call('POST', '/employees', { employee_code, name, employee_type, designation, salary_type, basic_salary, daily_wage, join_date: daysAgo(200), phone: '98' + Math.floor(10000000 + Math.random() * 89999999) }));
  }

  console.log('Creating projects...');
  const projectDefs = [
    ['Shree Residency', clients[0].id, 'Kathmandu', 5800000, 'Running', daysAgo(220), daysAhead(60)],
    ['Green City Complex', clients[1].id, 'Lalitpur', 12500000, 'Running', daysAgo(180), daysAhead(150)],
    ['Pokhara Hotel', clients[2].id, 'Pokhara', 7500000, 'Running', daysAgo(150), daysAhead(120)],
    ['Butwal Shopping Mall', clients[3].id, 'Butwal', 21000000, 'Running', daysAgo(300), daysAhead(200)],
    ['Birtamod House', clients[4].id, 'Jhapa', 4800000, 'Completed', daysAgo(400), daysAgo(30)],
  ];
  const projects = [];
  for (const [project_name, client_id, location, contract_amount, status, start_date_ad, end_date_ad] of projectDefs) {
    projects.push(await call('POST', '/projects', { project_name, client_id, location, contract_amount, status, start_date_ad, end_date_ad, description: `${project_name} construction project.` }));
  }

  console.log('Updating stage progress for Shree Residency...');
  const p1 = await call('GET', `/projects/${projects[0].id}`);
  const stageProgress = { 'Site Preparation': [100, 'Completed'], 'Foundation': [100, 'Completed'], 'Structure': [100, 'Completed'], 'Brick Work': [70, 'Running'], 'Plumbing': [20, 'Running'], 'Electrical': [10, 'Running'] };
  for (const s of p1.stages) {
    if (stageProgress[s.stage_name]) {
      const [progress_percentage, status] = stageProgress[s.stage_name];
      await call('PUT', `/projects/${projects[0].id}/stages/${s.id}`, { progress_percentage, status });
    }
  }
  const p2 = await call('GET', `/projects/${projects[1].id}`);
  for (const s of p2.stages.slice(0, 2)) await call('PUT', `/projects/${projects[1].id}/stages/${s.id}`, { progress_percentage: 100, status: 'Completed' });
  for (const s of p2.stages.slice(2, 3)) await call('PUT', `/projects/${projects[1].id}/stages/${s.id}`, { progress_percentage: 30, status: 'Running' });
  const p5 = await call('GET', `/projects/${projects[4].id}`);
  for (const s of p5.stages) await call('PUT', `/projects/${projects[4].id}/stages/${s.id}`, { progress_percentage: 100, status: 'Completed' });

  console.log('Creating quotations...');
  await call('POST', '/quotations', { client_id: clients[0].id, title: 'Shree Residency Extension', vat_rate: 13, valid_until: daysAhead(30), items: [{ category: 'Civil', description: 'Excavation Work', unit: 'Cft', quantity: 500, rate: 120 }, { category: 'Civil', description: 'RCC Column Work', unit: 'Cft', quantity: 200, rate: 850 }] });
  const q2 = await call('POST', '/quotations', { client_id: clients[1].id, title: 'Green City Complex Phase 2', vat_rate: 13, valid_until: daysAhead(20), items: [{ category: 'Structure', description: 'Brickwork', unit: 'Sq.ft', quantity: 3000, rate: 180 }] });
  await call('POST', `/quotations/${q2.id}/approve`);
  const q3 = await call('POST', '/quotations', { client_id: clients[2].id, title: 'Pokhara Hotel Interior', vat_rate: 13, valid_until: daysAhead(15), items: [{ category: 'Finishing', description: 'Interior Painting', unit: 'Sq.ft', quantity: 8000, rate: 45 }] });
  await call('POST', `/quotations/${q3.id}/approve`);
  await call('POST', '/quotations', { client_id: clients[3].id, title: 'Butwal Mall Facade', vat_rate: 13, valid_until: daysAhead(25), items: [{ category: 'Facade', description: 'Glass Facade Work', unit: 'Sq.ft', quantity: 1200, rate: 950 }] });

  console.log('Creating invoices and payments...');
  const inv1 = await call('POST', '/invoices', { client_id: clients[0].id, project_id: projects[0].id, invoice_date: daysAgo(20), vat_rate: 13, items: [{ description: 'Construction Work - Phase 1', unit: 'Job', quantity: 1, rate: 2540000 }] });
  await call('POST', '/payments', { client_id: clients[0].id, project_id: projects[0].id, invoice_id: inv1.id, amount: 2100000, payment_method: 'Bank Transfer', payment_date: daysAgo(15) });

  const inv2 = await call('POST', '/invoices', { client_id: clients[1].id, project_id: projects[1].id, invoice_date: daysAgo(30), vat_rate: 13, items: [{ description: 'Construction Work - Phase 1', unit: 'Job', quantity: 1, rate: 1875000 }] });
  await call('POST', '/payments', { client_id: clients[1].id, project_id: projects[1].id, invoice_id: inv2.id, amount: 1875000, payment_method: 'Bank Transfer', payment_date: daysAgo(25) });

  const inv3 = await call('POST', '/invoices', { client_id: clients[2].id, project_id: projects[2].id, invoice_date: daysAgo(10), vat_rate: 13, items: [{ description: 'Construction Work - Phase 1', unit: 'Job', quantity: 1, rate: 1800000 }] });
  await call('POST', '/payments', { client_id: clients[2].id, project_id: projects[2].id, invoice_id: inv3.id, amount: 500000, payment_method: 'Cheque', payment_date: daysAgo(5) });

  const inv4 = await call('POST', '/invoices', { client_id: clients[3].id, project_id: projects[3].id, invoice_date: daysAgo(8), vat_rate: 13, items: [{ description: 'Construction Work - Phase 1', unit: 'Job', quantity: 1, rate: 3500000 }] });
  await call('POST', '/payments', { client_id: clients[3].id, project_id: projects[3].id, invoice_id: inv4.id, amount: 1800000, payment_method: 'Bank Transfer', payment_date: daysAgo(3) });

  await call('POST', '/invoices', { client_id: clients[4].id, project_id: projects[4].id, invoice_date: daysAgo(40), vat_rate: 13, items: [{ description: 'Final Handover Billing', unit: 'Job', quantity: 1, rate: 4800000 }] });

  console.log('Issuing materials to sites...');
  await call('POST', '/material-issues', { project_id: projects[0].id, issue_date: daysAgo(10), remarks: 'Foundation stage materials', items: [{ material_id: materials[0].id, quantity: 400, unit_cost: 520 }, { material_id: materials[1].id, quantity: 600, unit_cost: 80 }, { material_id: materials[3].id, quantity: 2000, unit_cost: 9 }] });
  await call('POST', '/material-issues', { project_id: projects[1].id, issue_date: daysAgo(5), remarks: 'Structure stage materials', items: [{ material_id: materials[4].id, quantity: 500, unit_cost: 90 }, { material_id: materials[2].id, quantity: 700, unit_cost: 90 }] });

  console.log('Recording material purchases...');
  const pur1 = await call('POST', '/material-purchases', { supplier_id: suppliers[0].id, project_id: projects[0].id, purchase_date: daysAgo(14), invoice_ref: 'BILL-4471', vat_rate: 13, items: [{ material_id: materials[0].id, quantity: 300, unit_cost: 520 }] });
  await call('POST', `/material-purchases/${pur1.id}/pay`, { amount: 150000 });
  const pur2 = await call('POST', '/material-purchases', { supplier_id: suppliers[1].id, project_id: projects[1].id, purchase_date: daysAgo(7), invoice_ref: 'BILL-8820', vat_rate: 13, items: [{ material_id: materials[4].id, quantity: 400, unit_cost: 90 }] });
  await call('POST', `/material-purchases/${pur2.id}/pay`, { amount: pur2.grand_total });

  console.log('Recording expenses...');
  const expenseDefs = [
    [projects[0].id, daysAgo(0), 'Transport', 'Material transport to site', 3500, 'Ram Bahadur'],
    [projects[0].id, daysAgo(1), 'Food', 'Worker lunch', 1200, 'Site Office'],
    [projects[1].id, daysAgo(2), 'Fuel', 'Generator diesel', 4200, 'Bikash Yadav'],
    [null, daysAgo(3), 'Office', 'Stationery and printing', 1800, 'Store'],
    [projects[2].id, daysAgo(6), 'Equipment', 'Scaffolding rental', 8000, 'Suman Thapa'],
    [projects[3].id, daysAgo(9), 'Transport', 'Site vehicle fuel', 5200, 'Site Office'],
    [projects[0].id, daysAgo(12), 'Miscellaneous', 'Site cleaning', 900, 'Ram Bahadur'],
    [projects[1].id, daysAgo(18), 'Food', 'Worker snacks', 1500, 'Store'],
    [projects[3].id, daysAgo(25), 'Fuel', 'Mixer machine fuel', 3800, 'Bikash Yadav'],
    [null, daysAgo(28), 'Office', 'Internet bill', 2000, 'Store'],
  ];
  for (const [project_id, expense_date, expense_type, description, amount, paid_by] of expenseDefs) {
    await call('POST', '/expenses', { project_id, expense_date, expense_type, description, amount, paid_by, payment_method: 'Cash' });
  }

  console.log('Marking attendance...');
  const statuses = ['Present', 'Present', 'Present', 'Present', 'Present', 'Half Day', 'Absent'];
  for (let d = 0; d < 5; d++) {
    for (let i = 0; i < employees.length; i++) {
      const status = d === 0 ? statuses[i % statuses.length] : 'Present';
      await call('POST', '/attendance', { employee_id: employees[i].id, project_id: projects[i % 4].id, attendance_date: daysAgo(d), status, check_in: '07:45', check_out: status === 'Half Day' ? '12:00' : '17:00', regular_hours: status === 'Half Day' ? 4 : 8, daily_wage: employeeDefs[i][6] || 0, overtime_hours: d === 1 ? 2 : 0 });
    }
  }

  console.log('Giving employee advances...');
  await call('POST', '/advances', { employee_id: employees[0].id, advance_date: daysAgo(20), amount: 5000, remarks: 'Festival advance' });
  await call('POST', '/advances', { employee_id: employees[4].id, advance_date: daysAgo(15), amount: 2000, remarks: 'Emergency advance' });

  console.log('Processing salaries...');
  const currentMonth = new Date().toISOString().slice(0, 7);
  for (const e of employees) {
    await call('POST', '/salaries/process', { employee_id: e.id, salary_month: currentMonth, allowance: 500, bonus: 0, advance_deduction: 0, other_deduction: 0 });
  }

  console.log('Adding site diary logs...');
  await call('POST', `/projects/${projects[0].id}/logs`, { log_date: daysAgo(1), weather: 'Sunny', today_work: 'Brick work on 2nd floor walls', worker_count: 8, materials_used: 'Bricks, Cement, Sand', work_progress: 3, problems_delays: 'None', tomorrow_plan: 'Continue brick work, start plumbing layout' });
  await call('POST', `/projects/${projects[0].id}/logs`, { log_date: daysAgo(2), weather: 'Cloudy', today_work: 'Column casting for ground floor', worker_count: 10, materials_used: 'Steel, Cement, Aggregate', work_progress: 5, problems_delays: 'Late cement delivery, 2hr delay', tomorrow_plan: 'Curing, start brick work' });
  await call('POST', `/projects/${projects[1].id}/logs`, { log_date: daysAgo(1), weather: 'Sunny', today_work: 'Structure column shuttering', worker_count: 14, work_progress: 2, tomorrow_plan: 'Column concrete pour' });

  console.log('Creating equipment...');
  const equipment = [];
  equipment.push(await call('POST', '/equipment', { name: 'Excavator', equipment_code: 'EQ-001', type: 'Heavy Machinery', purchase_cost: 4500000, current_value: 3800000, status: 'Available' }));
  equipment.push(await call('POST', '/equipment', { name: 'Concrete Mixer', equipment_code: 'EQ-002', type: 'Machinery', purchase_cost: 250000, current_value: 190000, status: 'Available' }));
  equipment.push(await call('POST', '/equipment', { name: 'Vibrator Machine', equipment_code: 'EQ-003', type: 'Tool', purchase_cost: 45000, current_value: 30000, status: 'Available' }));

  console.log('Recording equipment operations...');
  await call('POST', '/equipment-assignments', { equipment_id: equipment[0].id, project_id: projects[0].id, assigned_date: daysAgo(20), fuel_cost: 8500, remarks: 'Foundation excavation' });
  await call('POST', '/equipment-assignments', { equipment_id: equipment[1].id, project_id: projects[1].id, assigned_date: daysAgo(6), fuel_cost: 1200 });
  await call('POST', '/equipment-maintenance', { equipment_id: equipment[2].id, maintenance_date: daysAgo(4), description: 'Motor repair and servicing', cost: 3500, next_service_date: daysAhead(60) });
  await call('POST', '/equipment-rentals', { equipment_id: equipment[2].id, customer_name: 'City Builders Pvt. Ltd.', start_date: daysAgo(30), end_date: daysAgo(20), rental_income: 15000, rental_expense: 1500, status: 'Completed' });

  console.log('\nDemo data seed complete.');
}

run().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
