# ETCRM

A React + Node CRM with Admin and Sales roles, CSV lead upload, quota tracking, lead notes, and CSV reporting.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for current implementation status, local run notes, and next deployment steps.

## Demo Accounts

- Admin: `admin@etcrm.local` / `password123`
- Sales: `sales@etcrm.local` / `password123`
- Sales: `maria@etcrm.local` / `password123`

## Run Locally

```bash
pnpm install
node server/prisma/seed.js
```

For the local SQLite demo database, run the SQL setup files in `server/prisma/` as described in `PROJECT_STATUS.md`.

Client: http://127.0.0.1:5173
API: http://127.0.0.1:4000
