# Deployment

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for the step-by-step low-hassle path.

The easiest free preview setup is:

- Frontend: Vercel
- API: Render web service
- Database: Supabase Postgres

## 1. Create Supabase Database

Create a Supabase project and copy the connection string.

For hosted Postgres, use `server/prisma/schema.postgres.prisma`. Keep `schema.prisma` for local SQLite development.

## 2. Deploy API on Render

Use `server/render.yaml` or create a web service manually:

- Root directory: `server`
- Build command: `pnpm install && pnpm prisma:prod && pnpm db:prod:push`
- Start command: `pnpm start`

Environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL`

After the first deploy, seed the production admin:

```bash
pnpm seed:prod
```

## 3. Deploy Frontend on Vercel

Create a Vercel project with:

- Root directory: `client`
- Build command: `pnpm build`
- Output directory: `dist`

Environment variable:

- `VITE_API_URL=https://your-render-api-url.onrender.com/api`

Then update Render `CLIENT_URL` to your Vercel URL.

## 4. First Login

Use the admin email/password you provided through `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
