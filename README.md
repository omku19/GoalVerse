# Goalverse

Goalverse is a role-based Employee Goal Management and Performance Tracking MVP built with React Vite, Tailwind CSS, Express, Prisma, PostgreSQL, JWT auth, and Recharts.

## What Is Included

- HR/Admin, Manager, and Employee login flows
- JWT authentication, protected routes, role middleware, password hashing
- HR department and user management
- Employee goal creation, progress tracking, and quarterly submissions
- Manager approval, rejection, team overview, and review feedback
- HR organization dashboard, department stats, and analytics charts
- Activity logs and lightweight notifications
- Neon PostgreSQL Prisma schema and realistic seed data

## Monorepo Structure

```text
backend/
  prisma/
  src/config/
  src/controllers/
  src/middleware/
  src/routes/
  src/services/
  src/utils/
frontend/
  src/components/
  src/context/
  src/hooks/
  src/layouts/
  src/pages/
  src/routes/
  src/services/
  src/utils/
```

## Environment Setup

Copy the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1d"
ADMIN_EMAIL="optional-extra-admin@example.com"
ADMIN_PASSWORD="Password@123"
FRONTEND_URL="http://localhost:5173"
```

Frontend variables:

```bash
VITE_API_URL="http://localhost:5000/api"
```

## Install

```bash
npm install
```

## Database

Generate Prisma client:

```bash
npm run prisma:generate --workspace backend
```

Push schema to Neon/PostgreSQL:

```bash
cd backend
npx prisma db push
```

Seed demo data:

```bash
npm run db:seed --workspace backend
```

The seed creates departments, HR admins, managers, employees, goals, activity logs, notifications, and quarterly check-ins.

## Demo Accounts

Default password for all seeded users:

```text
Password@123
```

Useful accounts:

```text
hr1@goalverse.com
hr2@goalverse.com
manager1@goalverse.com
manager2@goalverse.com
manager3@goalverse.com
employee1@goalverse.com
employee2@goalverse.com
employee3@goalverse.com
```

## Run Locally

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Open:

```text
http://localhost:5173/login
```

## Build

```bash
npm run build
```

## Core API

Auth:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Departments and users:

```text
GET  /api/departments
POST /api/departments
PUT  /api/departments/:id
GET  /api/departments/:id/managers
GET  /api/users
POST /api/users
PUT  /api/users/:id
PATCH /api/users/:id/deactivate
```

Goals and workflow:

```text
GET    /api/goals
POST   /api/goals
GET    /api/goals/:id
PUT    /api/goals/:id
DELETE /api/goals/:id
PATCH  /api/goals/:id/approve
PATCH  /api/goals/:id/reject
PATCH  /api/goals/:id/progress
PATCH  /api/goals/:id/complete
```

Submissions and dashboards:

```text
POST  /api/checkins
GET   /api/checkins
PATCH /api/checkins/:id/review
GET   /api/dashboard/employee
GET   /api/dashboard/manager
GET   /api/dashboard/hr
GET   /api/analytics/completion-rate
GET   /api/analytics/department-comparison
GET   /api/analytics/delayed-goals
```

## Deployment Notes

Frontend on Vercel:

- Build command: `npm run build --workspace frontend`
- Output directory: `frontend/dist`
- Set `VITE_API_URL` to the deployed Render backend URL plus `/api`

Backend on Render:

- Root directory: `backend`
- Build command: `npm install && npx prisma generate`
- Start command: `npm start`
- Set `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and frontend CORS URL variables

Database on Neon:

- Use the pooled or direct Neon PostgreSQL URL with `sslmode=require`
- Run `npx prisma db push` and `npm run db:seed --workspace backend` after configuring environment variables

## Demo Flow

1. Log in as `employee1@goalverse.com`.
2. Create a goal for Q2 2026.
3. Log in as `manager1@goalverse.com`.
4. Approve the pending goal, set priority, and deadline.
5. Log back in as the employee.
6. Update progress and submit a quarterly check-in.
7. Log in as the manager and add review feedback.
8. Log in as `hr1@goalverse.com` to view organization analytics.
