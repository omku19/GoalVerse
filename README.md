# Goalverse

Goalverse is a Goal Setting and Tracking Portal for three roles: Employee, Manager (L1), and Admin/HR. It supports annual goal sheets, manager approval and locking, quarterly check-ins, achievement reporting, audit trails, HR analytics, and deployment to Vercel plus Render.

## Core Flow

1. HR opens the annual goal cycle.
2. Employees create up to 8 goals for the cycle with Thrust Area, Title, Description, UoM, Target, and Weightage.
3. Employees submit the whole goal sheet only when total weightage is exactly 100% and each goal is at least 10%.
4. Managers review submitted sheets, edit targets/weightages, approve and lock the sheet, or return it for rework.
5. HR opens quarterly check-in windows.
6. Employees log Actual Achievement and status during an open window only.
7. Managers review Planned vs Actual and add structured comments.
8. HR exports Achievement Reports, views completion analytics, and audits post-lock changes.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Recharts
- Backend: Express, Prisma, PostgreSQL
- Auth: JWT with persisted session revocation and idle expiry
- Deployment targets: Vercel for frontend, Render for backend

## Environment

Frontend variables are documented in `frontend/.env.example`.

Required frontend variable for production:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com/api
```

Backend variables are documented in `backend/.env.example`.

Required backend production variables:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-secret
FRONTEND_URL=https://your-vercel-app.vercel.app
FRONTEND_URLS=https://your-vercel-app.vercel.app
```

## Local Development

Install dependencies:

```bash
npm install
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

Seed demo data:

```bash
npm run db:seed --workspace backend
```

Start backend:

```bash
npm run dev:backend
```

Start frontend:

```bash
npm run dev:frontend
```

## Demo Accounts

All seeded users use:

```text
Password@123
```

- HR: `hr1@goalverse.com`
- Manager: `manager1@goalverse.com`
- Employee: `employee1@goalverse.com`

## Deployment

### Vercel Frontend

Use the repository root. `vercel.json` builds `frontend` and serves `frontend/dist`.

Set:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com/api
```

### Render Backend

Use the included `render.yaml` blueprint or these commands:

Build command:

```bash
npm install && npm run render:build
```

Start command:

```bash
npm run start --workspace backend
```

`render:build` runs Prisma generation and production migration deployment.

## Verification

Useful checks before submission:

```bash
npm run build
npm run build:backend
npm run prisma:generate
node --check backend/src/routes/mvpRoutes.js
```
