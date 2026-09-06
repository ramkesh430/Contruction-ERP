import { Router } from 'express';
import { z } from 'zod';
import { login, me } from '../controllers/authController.js';
import { dashboard,listFiscalYears } from '../controllers/dashboardController.js';
import { globalSearch } from '../controllers/searchController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { list,create,update,softDelete } from '../controllers/crudController.js';
import { listExpenses,createExpense,updateExpense,deleteExpense,approveExpense,rejectExpense,uploadBill,listExpenseCategories,createExpenseCategory,updateExpenseCategory,deleteExpenseCategory } from '../controllers/expenseController.js';
import { listClients,createClient,updateClient,deleteClient,archiveClient,unarchiveClient,getClientDetail,listClientDocuments,addClientDocument,deleteClientDocument } from '../controllers/clientController.js';
import { listSuppliers,createSupplier,updateSupplier,deleteSupplier,archiveSupplier,unarchiveSupplier,getSupplierDetail,listSupplierDocuments,addSupplierDocument,deleteSupplierDocument } from '../controllers/supplierController.js';
import { listEmployees,createEmployee,updateEmployee,deleteEmployee,getEmployeeDetail,listEmployeeDocuments,addEmployeeDocument,deleteEmployeeDocument } from '../controllers/employeeController.js';
import { listEquipment,createEquipment,updateEquipment,deleteEquipment,getEquipmentDetail } from '../controllers/equipmentController.js';
import { listProjects,createProject,getProject,updateProject,deleteProject,archiveProject,unarchiveProject,updateStage,addDailyLog,listDailyLogs,updateDailyLog,deleteDailyLog,listDocuments,addDocument,deleteDocument,listPhotos,addPhoto,deletePhoto,listVariations,createVariation,updateVariation,deleteVariation } from '../controllers/projectController.js';
import { listInvoices,getInvoice,createInvoice,updateInvoice,deleteInvoice,listPayments,getPayment,createPayment,updatePayment,deletePayment } from '../controllers/billingController.js';
import { listQuotations,createQuotation,updateQuotation,deleteQuotation,approveQuotation,rejectQuotation,markSent,getQuotation,duplicateQuotation,convertToProject,listQuotationAttachments,addQuotationAttachment,deleteQuotationAttachment } from '../controllers/quotationController.js';
import { stock,issue } from '../controllers/inventoryController.js';
import { listCategories,createCategory,updateCategory,deleteCategory,adjustStock,getMaterialLedger } from '../controllers/materialController.js';
import { listAttendance,markAttendance,updateAttendance,deleteAttendance } from '../controllers/attendanceController.js';
import { profitReport,profitLossReport,attendanceReport,taxSummaryReport } from '../controllers/reportController.js';
import { getSettings,updateSettings,uploadLogo,uploadStamp,uploadSignature,uploadQr,createFiscalYear,setCurrentFiscalYear } from '../controllers/settingsController.js';
import { listUsers,createUser,updateUser,deleteUser,listRoles,createRole,updateRole,deleteRole,listPermissions,setRolePermissions,listAuditLogs } from '../controllers/userController.js';
import { listSalaries,getSalary,processSalary,updateSalaryRecord,deleteSalaryRecord } from '../controllers/salaryController.js';
import { listPurchases,getPurchase,createPurchase,updatePurchase,deletePurchase,payPurchase,getSupplierPayment } from '../controllers/purchaseController.js';
import { listAssignments,createAssignment,returnAssignment,updateAssignment,deleteAssignment,listMaintenance,createMaintenance,updateMaintenance,deleteMaintenance,listRentals,createRental,updateRental,deleteRental } from '../controllers/equipmentOpsController.js';
import { listAdvances,createAdvance,updateAdvance,deleteAdvance,outstandingAdvance } from '../controllers/advanceController.js';
import { listNotifications,markNotificationRead,markAllRead } from '../controllers/notificationController.js';
import { upload } from '../middleware/upload.js';

const r=Router();
r.post('/auth/login',validate(z.object({email:z.email(),password:z.string().min(6)})),login);
r.get('/auth/me',authenticate,me);
r.use(authenticate);
r.get('/dashboard',dashboard);r.get('/fiscal-years',listFiscalYears);r.get('/search',globalSearch);

// Every module below is now gated by requirePermission(code) — previously
// defined in middleware/auth.js but never actually applied to a route
// (and broken: the exported function was itself `async`, so it returned a
// Promise instead of a middleware — Express would have rejected it as
// "argument handler must be a function" the moment any route used it).
// Super Admin bypasses all checks (see requirePermission). Modules that had
// no permission codes at all (suppliers/employees/equipment/materials/
// purchases/advances) got a `.view`/`.manage` pair added in seed.js, same
// granularity as the codes that already existed for other modules.
const resources={
  materials:['name','category_id','sku','unit','opening_stock','minimum_stock','default_unit_cost','notes']
};
for(const [name,fields] of Object.entries(resources)){
  r.get(`/${name}`,requirePermission('materials.view'),list(name));
  r.post(`/${name}`,requirePermission('materials.manage'),create(name,fields));
  r.put(`/${name}/:id`,requirePermission('materials.manage'),update(name,fields));
  r.delete(`/${name}/:id`,requirePermission('materials.manage'),softDelete(name));
}
r.get('/expenses',requirePermission('expenses.view'),listExpenses);
r.post('/expenses',requirePermission('expenses.create'),createExpense);
r.put('/expenses/:id',requirePermission('expenses.create'),updateExpense);
r.delete('/expenses/:id',requirePermission('expenses.create'),deleteExpense);
r.post('/expenses/:id/approve',requirePermission('expenses.approve'),approveExpense);
r.post('/expenses/:id/reject',requirePermission('expenses.approve'),rejectExpense);
r.post('/expenses/:id/bill',requirePermission('expenses.create'),upload.single('file'),uploadBill);
r.get('/expense-categories',requirePermission('expenses.view'),listExpenseCategories);
r.post('/expense-categories',requirePermission('expenses.create'),createExpenseCategory);
r.put('/expense-categories/:id',requirePermission('expenses.create'),updateExpenseCategory);
r.delete('/expense-categories/:id',requirePermission('expenses.create'),deleteExpenseCategory);

r.get('/clients',requirePermission('clients.view'),listClients);
r.post('/clients',requirePermission('clients.create'),createClient);
r.get('/clients/:id',requirePermission('clients.view'),getClientDetail);
r.put('/clients/:id',requirePermission('clients.edit'),updateClient);
r.delete('/clients/:id',requirePermission('clients.edit'),deleteClient);
r.post('/clients/:id/archive',requirePermission('clients.edit'),archiveClient);
r.post('/clients/:id/unarchive',requirePermission('clients.edit'),unarchiveClient);
r.get('/clients/:id/documents',requirePermission('clients.view'),listClientDocuments);
r.post('/clients/:id/documents',requirePermission('clients.edit'),upload.single('file'),addClientDocument);
r.delete('/clients/:id/documents/:docId',requirePermission('clients.edit'),deleteClientDocument);

r.get('/suppliers',requirePermission('suppliers.view'),listSuppliers);
r.post('/suppliers',requirePermission('suppliers.manage'),createSupplier);
r.get('/suppliers/:id',requirePermission('suppliers.view'),getSupplierDetail);
r.put('/suppliers/:id',requirePermission('suppliers.manage'),updateSupplier);
r.delete('/suppliers/:id',requirePermission('suppliers.manage'),deleteSupplier);
r.post('/suppliers/:id/archive',requirePermission('suppliers.manage'),archiveSupplier);
r.post('/suppliers/:id/unarchive',requirePermission('suppliers.manage'),unarchiveSupplier);
r.get('/suppliers/:id/documents',requirePermission('suppliers.view'),listSupplierDocuments);
r.post('/suppliers/:id/documents',requirePermission('suppliers.manage'),upload.single('file'),addSupplierDocument);
r.delete('/suppliers/:id/documents/:docId',requirePermission('suppliers.manage'),deleteSupplierDocument);

r.get('/employees',requirePermission('employees.view'),listEmployees);
r.post('/employees',requirePermission('employees.manage'),createEmployee);
r.get('/employees/:id',requirePermission('employees.view'),getEmployeeDetail);
r.put('/employees/:id',requirePermission('employees.manage'),updateEmployee);
r.delete('/employees/:id',requirePermission('employees.manage'),deleteEmployee);
r.get('/employees/:id/documents',requirePermission('employees.view'),listEmployeeDocuments);
r.post('/employees/:id/documents',requirePermission('employees.manage'),upload.single('file'),addEmployeeDocument);
r.delete('/employees/:id/documents/:docId',requirePermission('employees.manage'),deleteEmployeeDocument);

r.get('/equipment',requirePermission('equipment.view'),listEquipment);
r.post('/equipment',requirePermission('equipment.manage'),createEquipment);
r.get('/equipment/:id',requirePermission('equipment.view'),getEquipmentDetail);
r.put('/equipment/:id',requirePermission('equipment.manage'),updateEquipment);
r.delete('/equipment/:id',requirePermission('equipment.manage'),deleteEquipment);

r.get('/projects',requirePermission('projects.view'),listProjects);
r.post('/projects',requirePermission('projects.create'),createProject);
r.get('/projects/:id',requirePermission('projects.view'),getProject);
r.put('/projects/:id',requirePermission('projects.edit'),updateProject);
r.delete('/projects/:id',requirePermission('projects.delete'),deleteProject);
r.put('/projects/:id/stages/:stageId',requirePermission('projects.edit'),updateStage);
r.post('/projects/:id/archive',requirePermission('projects.edit'),archiveProject);
r.post('/projects/:id/unarchive',requirePermission('projects.edit'),unarchiveProject);
r.get('/projects/:id/variations',requirePermission('projects.view'),listVariations);
r.post('/projects/:id/variations',requirePermission('projects.edit'),createVariation);
r.put('/projects/:id/variations/:varId',requirePermission('projects.edit'),updateVariation);
r.delete('/projects/:id/variations/:varId',requirePermission('projects.edit'),deleteVariation);
r.get('/projects/:id/logs',requirePermission('projects.view'),listDailyLogs);
r.post('/projects/:id/logs',requirePermission('projects.edit'),addDailyLog);
r.put('/projects/:id/logs/:logId',requirePermission('projects.edit'),updateDailyLog);
r.delete('/projects/:id/logs/:logId',requirePermission('projects.edit'),deleteDailyLog);
r.get('/projects/:id/documents',requirePermission('projects.view'),listDocuments);
r.post('/projects/:id/documents',requirePermission('projects.edit'),upload.single('file'),addDocument);
r.delete('/projects/:id/documents/:docId',requirePermission('projects.edit'),deleteDocument);
r.get('/projects/:id/photos',requirePermission('projects.view'),listPhotos);
r.post('/projects/:id/photos',requirePermission('projects.edit'),upload.single('file'),addPhoto);
r.delete('/projects/:id/photos/:photoId',requirePermission('projects.edit'),deletePhoto);

r.get('/material-purchases',requirePermission('purchases.view'),listPurchases);
r.post('/material-purchases',requirePermission('purchases.manage'),createPurchase);
r.get('/material-purchases/:id',requirePermission('purchases.view'),getPurchase);
r.put('/material-purchases/:id',requirePermission('purchases.manage'),updatePurchase);
r.delete('/material-purchases/:id',requirePermission('purchases.manage'),deletePurchase);
r.post('/material-purchases/:id/pay',requirePermission('purchases.manage'),payPurchase);
r.get('/supplier-payments/:id',requirePermission('purchases.view'),getSupplierPayment);

r.get('/equipment-assignments',requirePermission('equipment.view'),listAssignments);
r.post('/equipment-assignments',requirePermission('equipment.manage'),createAssignment);
r.put('/equipment-assignments/:id',requirePermission('equipment.manage'),updateAssignment);
r.delete('/equipment-assignments/:id',requirePermission('equipment.manage'),deleteAssignment);
r.post('/equipment-assignments/:id/return',requirePermission('equipment.manage'),returnAssignment);
r.get('/equipment-maintenance',requirePermission('equipment.view'),listMaintenance);
r.post('/equipment-maintenance',requirePermission('equipment.manage'),createMaintenance);
r.put('/equipment-maintenance/:id',requirePermission('equipment.manage'),updateMaintenance);
r.delete('/equipment-maintenance/:id',requirePermission('equipment.manage'),deleteMaintenance);
r.get('/equipment-rentals',requirePermission('equipment.view'),listRentals);
r.post('/equipment-rentals',requirePermission('equipment.manage'),createRental);
r.put('/equipment-rentals/:id',requirePermission('equipment.manage'),updateRental);
r.delete('/equipment-rentals/:id',requirePermission('equipment.manage'),deleteRental);

r.get('/advances',requirePermission('advances.view'),listAdvances);
r.post('/advances',requirePermission('advances.manage'),createAdvance);
r.put('/advances/:id',requirePermission('advances.manage'),updateAdvance);
r.delete('/advances/:id',requirePermission('advances.manage'),deleteAdvance);
r.get('/advances/employee/:employeeId/outstanding',requirePermission('advances.view'),outstandingAdvance);

// Personal to the logged-in user — no module permission needed.
r.get('/notifications',listNotifications);r.post('/notifications/:id/read',markNotificationRead);r.post('/notifications/read-all',markAllRead);

r.get('/quotations',requirePermission('quotation.view'),listQuotations);
r.post('/quotations',requirePermission('quotation.create'),createQuotation);
r.get('/quotations/:id',requirePermission('quotation.view'),getQuotation);
r.put('/quotations/:id',requirePermission('quotation.create'),updateQuotation);
r.delete('/quotations/:id',requirePermission('quotation.create'),deleteQuotation);
r.post('/quotations/:id/approve',requirePermission('quotation.approve'),approveQuotation);
r.post('/quotations/:id/reject',requirePermission('quotation.approve'),rejectQuotation);
r.post('/quotations/:id/send',requirePermission('quotation.create'),markSent);
r.post('/quotations/:id/duplicate',requirePermission('quotation.create'),duplicateQuotation);
r.post('/quotations/:id/convert-to-project',requirePermission('quotation.approve'),convertToProject);
r.get('/quotations/:id/attachments',requirePermission('quotation.view'),listQuotationAttachments);
r.post('/quotations/:id/attachments',requirePermission('quotation.create'),upload.single('file'),addQuotationAttachment);
r.delete('/quotations/:id/attachments/:attId',requirePermission('quotation.create'),deleteQuotationAttachment);

r.get('/materials/stock/summary',requirePermission('materials.view'),stock);
r.post('/material-issues',requirePermission('materials.manage'),issue);
r.get('/material-categories',requirePermission('materials.view'),listCategories);
r.post('/material-categories',requirePermission('materials.manage'),createCategory);
r.put('/material-categories/:id',requirePermission('materials.manage'),updateCategory);
r.delete('/material-categories/:id',requirePermission('materials.manage'),deleteCategory);
r.post('/materials/:id/adjust',requirePermission('materials.manage'),adjustStock);
r.get('/materials/:id/ledger',requirePermission('materials.view'),getMaterialLedger);

r.get('/invoices',requirePermission('invoice.view'),listInvoices);
r.post('/invoices',requirePermission('invoice.create'),createInvoice);
r.get('/invoices/:id',requirePermission('invoice.view'),getInvoice);
r.put('/invoices/:id',requirePermission('invoice.create'),updateInvoice);
r.delete('/invoices/:id',requirePermission('invoice.create'),deleteInvoice);

r.get('/payments',requirePermission('payments.view'),listPayments);
r.post('/payments',requirePermission('payments.create'),createPayment);
r.get('/payments/:id',requirePermission('payments.view'),getPayment);
r.put('/payments/:id',requirePermission('payments.create'),updatePayment);
r.delete('/payments/:id',requirePermission('payments.create'),deletePayment);

r.get('/attendance',requirePermission('attendance.manage'),listAttendance);
r.post('/attendance',requirePermission('attendance.manage'),markAttendance);
r.put('/attendance/:id',requirePermission('attendance.manage'),updateAttendance);
r.delete('/attendance/:id',requirePermission('attendance.manage'),deleteAttendance);

r.get('/reports/project-profit',requirePermission('reports.view'),profitReport);
r.get('/reports/profit-loss',requirePermission('reports.view'),profitLossReport);
r.get('/reports/attendance',requirePermission('reports.view'),attendanceReport);
r.get('/reports/tax-summary',requirePermission('reports.view'),taxSummaryReport);

r.get('/salaries',requirePermission('salary.view'),listSalaries);
r.get('/salaries/:id',requirePermission('salary.view'),getSalary);
r.post('/salaries/process',requirePermission('salary.process'),processSalary);
r.put('/salaries/:id',requirePermission('salary.process'),updateSalaryRecord);
r.delete('/salaries/:id',requirePermission('salary.process'),deleteSalaryRecord);

r.get('/users',requirePermission('users.manage'),listUsers);
r.post('/users',requirePermission('users.manage'),createUser);
r.put('/users/:id',requirePermission('users.manage'),updateUser);
r.delete('/users/:id',requirePermission('users.manage'),deleteUser);
r.get('/roles',requirePermission('users.manage'),listRoles);
r.post('/roles',requirePermission('users.manage'),createRole);
r.put('/roles/:id',requirePermission('users.manage'),updateRole);
r.delete('/roles/:id',requirePermission('users.manage'),deleteRole);
r.get('/permissions',requirePermission('users.manage'),listPermissions);
r.put('/roles/:id/permissions',requirePermission('users.manage'),setRolePermissions);
r.get('/audit-logs',requirePermission('users.manage'),listAuditLogs);

// GET /settings stays open to any authenticated user — other pages (e.g.
// invoice numbering, VAT rate) read company-wide settings, not just the
// Settings page itself. Only changing settings needs the permission.
r.get('/settings',getSettings);
r.put('/settings',requirePermission('settings.manage'),updateSettings);
r.post('/settings/logo',requirePermission('settings.manage'),upload.single('file'),uploadLogo);
r.post('/settings/stamp',requirePermission('settings.manage'),upload.single('file'),uploadStamp);
r.post('/settings/signature',requirePermission('settings.manage'),upload.single('file'),uploadSignature);
r.post('/settings/qr',requirePermission('settings.manage'),upload.single('file'),uploadQr);
r.post('/fiscal-years',requirePermission('settings.manage'),createFiscalYear);
r.post('/fiscal-years/:id/set-current',requirePermission('settings.manage'),setCurrentFiscalYear);
export default r;
