# Construction ERP — Strong MVP Starter

Full-stack construction management ERP with **separate frontend, backend, and database folders**.

## Stack
- Frontend: React + Vite + Custom CSS + Axios + Chart.js
- Backend: Node.js + Express + MySQL + JWT + bcrypt + Helmet + CORS + rate limiting
- Database: MySQL 8+ / MariaDB-compatible SQL (MySQL recommended)

## Folder Structure
```
construction-erp/
  frontend/
  backend/
  database/
```

## Implemented MVP Foundation
- Login / JWT authentication
- Dashboard KPIs and charts
- Clients
- Projects + automatic project codes + default progress stages
- Quotations / BOQ-style line items
- Materials + stock structure + material issue API
- Suppliers
- Employees / Labour
- Attendance + daily wage / overtime calculation
- Expenses
- Invoices with configurable VAT input
- Payments / automatic receipt number
- Project financial report
- Equipment CRUD foundation
- Company settings
- RBAC database model and permission seed
- Audit log service
- Soft-delete structure
- Nepali FY / BS date storage fields

## Important Profit Rules
- Total Invoice = approved/issued invoices
- Total Received = successful payments
- Outstanding = Total Invoice - Total Received
- Material Cost = material issued to project
- Labour Cost = calculated attendance wage
- Other Cost = project expenses excluding Material/Labour
- Current Cash Profit = Total Received - Total Expense
- Projected Profit = Contract Value - Total Expense
- Profit Margin % = Projected Profit / Contract Value * 100

## Local Setup
### 1. Database
Create/import the schema:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p construction_erp < database/seed.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```
Backend: `http://localhost:5000`
Health: `http://localhost:5000/api/health`

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend: `http://localhost:5173`

## Default Admin
After `npm run seed`:
- Email: `admin@construction.local`
- Password: `Admin@123`

**Change the default password immediately in a real deployment.**

## Production Notes
Before production, complete these areas:
- Add permission middleware to every write endpoint according to your role matrix
- Add user/role management UI + APIs
- Add salary processing workflow
- Add material purchase/posting workflow and supplier ledger
- Add PDF templates for invoice/receipt/quotation/BOQ
- Add file upload endpoints with MIME/size validation
- Add automatic BS/AD conversion library if required
- Add backup/restore, HTTPS, secure secrets, database backups, and stronger rate limits
- Add transactional approval workflow for financial records
- Add full tests and migrations

## Phase 2 Ready Database Tables
Equipment rental/maintenance, notifications, project documents/photos and SaaS-friendly `company_id` isolation are already included in the schema for extension.

## Deployment

### Frontend (Vercel)
The React app deploys to Vercel as a static Vite build. In the Vercel project settings
set **Root Directory** to `frontend`; [frontend/vercel.json](frontend/vercel.json)
supplies the build command, output directory, and the SPA rewrite that keeps deep
links such as `/projects/10` working on refresh.

Set one environment variable in Vercel:

```
VITE_API_URL=https://<your-api-host>/api
```

Until that host exists, the deployed site renders the login page but cannot sign in —
a browser on HTTPS will not call an API on `http://localhost`.

### Backend (not Vercel)
The API needs a host with a persistent filesystem and long-lived database
connections. Vercel's serverless runtime provides neither, so use Railway, Render,
Fly.io or a VPS, together with managed MySQL.

Two things must change before the backend runs anywhere but a single always-on box:
- `middleware/upload.js` writes to local disk. On any host with an ephemeral or
  multi-instance filesystem, move uploads to object storage (S3, R2, Vercel Blob).
- Set `FRONTEND_URL` to the deployed Vercel origin so CORS allows it, and set a
  strong `JWT_SECRET`.
