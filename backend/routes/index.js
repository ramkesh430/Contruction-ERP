import { Router } from 'express';
import { z } from 'zod';
import { login, me } from '../controllers/authController.js';
import { dashboard } from '../controllers/dashboardController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { list,create,update,softDelete } from '../controllers/crudController.js';
import { listProjects,createProject,getProject,updateStage,addDailyLog } from '../controllers/projectController.js';
import { listInvoices,createInvoice,listPayments,createPayment } from '../controllers/billingController.js';
import { listQuotations,createQuotation,approveQuotation } from '../controllers/quotationController.js';
import { stock,issue } from '../controllers/inventoryController.js';
import { listAttendance,markAttendance } from '../controllers/attendanceController.js';
import { profitReport } from '../controllers/reportController.js';
import { getSettings,updateSettings } from '../controllers/settingsController.js';
import { listUsers,createUser,listRoles,listPermissions,setRolePermissions } from '../controllers/userController.js';
import { listSalaries,processSalary } from '../controllers/salaryController.js';

const r=Router();
r.post('/auth/login',validate(z.object({email:z.email(),password:z.string().min(6)})),login);
r.get('/auth/me',authenticate,me);
r.use(authenticate);
r.get('/dashboard',dashboard);

const resources={
  clients:['name','contact_person','phone','email','address','pan_vat_no','notes'],
  suppliers:['name','contact_person','phone','email','address','pan_vat_no','opening_due','notes'],
  materials:['name','category_id','sku','unit','opening_stock','minimum_stock','default_unit_cost','notes'],
  employees:['employee_code','name','employee_type','phone','email','address','join_date','salary_type','basic_salary','daily_wage','designation','is_active'],
  expenses:['project_id','expense_date','expense_type','category_id','description','amount','payment_method','reference_no','bill_file'],
  equipment:['name','equipment_code','type','purchase_cost','current_value','status','notes']
};
for(const [name,fields] of Object.entries(resources)){
  r.get(`/${name}`,list(name)); r.post(`/${name}`,create(name,fields)); r.put(`/${name}/:id`,update(name,fields)); r.delete(`/${name}/:id`,softDelete(name));
}
r.get('/projects',listProjects);r.post('/projects',createProject);r.get('/projects/:id',getProject);r.put('/projects/:id/stages/:stageId',updateStage);r.post('/projects/:id/logs',addDailyLog);
r.get('/quotations',listQuotations);r.post('/quotations',createQuotation);r.post('/quotations/:id/approve',approveQuotation);
r.get('/materials/stock/summary',stock);r.post('/material-issues',issue);
r.get('/invoices',listInvoices);r.post('/invoices',createInvoice);r.get('/payments',listPayments);r.post('/payments',createPayment);
r.get('/attendance',listAttendance);r.post('/attendance',markAttendance);
r.get('/reports/project-profit',profitReport);
r.get('/salaries',listSalaries);r.post('/salaries/process',processSalary);
r.get('/users',listUsers);r.post('/users',createUser);r.get('/roles',listRoles);r.get('/permissions',listPermissions);r.put('/roles/:id/permissions',setRolePermissions);
r.get('/settings',getSettings);r.put('/settings',updateSettings);
export default r;
