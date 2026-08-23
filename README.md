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

A working free-tier stack, verified August 2026:

| Layer | Host | Free tier |
|---|---|---|
| Frontend | Vercel | Static Vite build, no card |
| Backend | Render | 750 instance-hours/month, no card, sleeps after 15 min idle |
| Database | Aiven MySQL | 1 GB storage, 1 GB RAM, no card |

Deploy in this order — the backend needs the database URL, and the frontend
needs the backend URL.

### 1. Database (Aiven)

Create a free MySQL service at [aiven.io](https://aiven.io/free-mysql-database).
From the service overview take the host, port, database name, user and password,
and download the **CA certificate**.

Import the schema and seed over TLS:

```bash
mysql --host=<host> --port=<port> --user=avnadmin --password=<password> \
  --ssl-ca=./ca.pem defaultdb < database/schema.sql
```

Then run the seed the same way with `database/seed.sql`, and create the admin
user by running `npm run seed` in `backend/` with the Aiven values in `.env`.

### 2. Backend (Render)

[render.yaml](render.yaml) at the repo root is a blueprint — point Render at
this repository and it configures the service, generates `JWT_SECRET`, and sets
`healthCheckPath` to `/api/health`. Fill in the values marked `sync: false` in
the dashboard from the Aiven connection details, plus:

- `DB_SSL=true` (already in the blueprint) — Aiven refuses plaintext connections
- `DB_SSL_CA` — paste the contents of `ca.pem`
- `FRONTEND_URL` — your Vercel origin, no trailing slash

Confirm with `curl https://<your-service>.onrender.com/api/health`, which should
return `{"ok":true,"database":true}`.

### 3. Frontend (Vercel)

Set **Root Directory** to `frontend`; [frontend/vercel.json](frontend/vercel.json)
supplies the build command, output directory, and the SPA rewrite that keeps deep
links such as `/projects/10` working on refresh.

Set one environment variable **before the first build**:

```
VITE_API_URL=https://<your-service>.onrender.com/api
```

`VITE_*` variables are inlined at build time, not read at runtime. Changing it
later has no effect until you redeploy.

### Free-tier limitations that will bite

- **Uploads do not survive.** Render's free instances have an ephemeral
  filesystem and cannot mount a persistent disk, so everything `multer` writes
  to `backend/uploads` — company logo, expense bills, project photos, client and
  employee documents — is deleted on every redeploy, restart and wake-from-sleep.
  Fixing this properly means moving `middleware/upload.js` to object storage
  (Cloudinary and Supabase Storage both have free tiers).
- **First request after idle takes ~1 minute.** Render sleeps a free service
  after 15 minutes without traffic. Aiven likewise powers off an idle free
  database. Expect the login page to hang on the first visit of the day.
- **1 GB of database storage** is ample for records but not for scanned
  documents — another reason to keep files out of MySQL and off the app disk.
