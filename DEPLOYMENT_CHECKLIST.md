# ETCRM Deployment Checklist

Recommended low-hassle setup:

- Frontend: Vercel
- Backend: Render Web Service
- Database: Supabase Postgres

## 1. Supabase

1. Create a Supabase project.
2. Open Project Settings > Database.
3. Copy the Postgres connection string.
4. Use the pooled connection string if available.
5. Make sure the URL includes SSL settings.
6. Keep the database password somewhere safe.

The Render backend will use this value as `DATABASE_URL`.

## 2. Render Backend

Create a Render Blueprint/Web Service from the GitHub repo. The root `render.yaml` defines the backend service.

- Repository: `nebasami123/ETCRM`
- Branch: `main`
- Root directory: `server`
- Build command: `pnpm install && pnpm prisma:prod && pnpm db:prod:push`
- Start command: `pnpm start`

Environment variables:

- `DATABASE_URL`: Supabase Postgres URL
- `JWT_SECRET`: long random secret
- `CLIENT_URL`: Vercel frontend URL, after frontend deploy
- `ADMIN_NAME`: first production admin name
- `ADMIN_EMAIL`: first production admin email
- `ADMIN_PASSWORD`: first production admin password, minimum 12 characters

After the first deploy, open Render Shell and run:

```bash
pnpm seed:prod
```

## 3. Vercel Frontend

Create a Vercel project from the GitHub repo.

- Repository: `nebasami123/ETCRM`
- Branch: `main`
- Root directory: repository root
- Build command: `pnpm --dir client build`
- Output directory: `client/dist`

Environment variable:

- `VITE_API_URL`: `https://YOUR-RENDER-SERVICE.onrender.com/api`

After Vercel deploys, copy the Vercel URL and set Render `CLIENT_URL` to that URL.

## 4. First Login

Use the admin created by:

```bash
pnpm seed:prod
```

Then create Sales users from the Admin dashboard.

## 5. Notes

- Do not use the demo seed in production.
- Render free web services may sleep after idle time. First request can be slow.
- Supabase free tier is enough for early testing, but watch storage/project limits.
