# Goalverse

Full-stack JavaScript monorepo using React, Vite, Tailwind CSS, Node.js, Express, Prisma, and PostgreSQL.

## Initialization Commands

```bash
npm init -y
mkdir frontend backend
cd frontend && npm init -y
npm install react react-dom @vitejs/plugin-react vite tailwindcss @tailwindcss/vite lucide-react
npm install -D eslint
cd ../backend && npm init -y
npm install express cors dotenv morgan @prisma/client
npm install -D prisma nodemon
npx prisma init --datasource-provider postgresql
```

## Scripts

```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run prisma:generate
npm run prisma:migrate
```

## Environment

Copy the example files before running locally:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Update `backend/.env` with your PostgreSQL connection string.

## Backend Auth Setup

Required backend environment variables:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/goalverse?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1d"
ADMIN_EMAIL="omkute6789@gmail.com"
ADMIN_PASSWORD="StrongPassword123"
```

Run the database migration and seed the default HR admin:

```bash
cd backend
npx prisma migrate dev --name sprint_1_auth_seed
npm run db:seed
```

Login endpoint:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "omkute6789@gmail.com",
  "password": "StrongPassword123"
}
```

Successful responses include a JWT token and sanitized user data. Invalid login attempts return:

```json
{
  "message": "Invalid credentials"
}
```

Logout endpoint:

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

Sprint 1 uses stateless JWT logout. The backend returns a success response, and the frontend removes the token and user from local auth state. A future refresh-token implementation can add a persisted refresh-token table and revoke refresh tokens server-side while keeping this route.

Current user endpoint:

```http
GET /api/auth/me
Authorization: Bearer <token>
```

Sample response:

```json
{
  "user": {
    "id": "user-id",
    "firstName": "HR",
    "lastName": "Admin",
    "email": "omkute6789@gmail.com",
    "role": "HR_ADMIN",
    "departmentId": null,
    "isActive": true
  }
}
```

Frontend login page:

```text
/login
```

The login page validates email/password, displays API errors, shows a loading state, stores the JWT and sanitized user profile on success, and redirects to `/`.

## Frontend Auth Architecture

Auth state lives in `AuthProvider` and is consumed through `useAuth()`.

Local storage keys:

```text
goalverse_auth_token
goalverse_auth_user
```

Routes:

```text
/login
/dashboard/employee
/dashboard/manager
/dashboard/hr-admin
/unauthorized
/404
```

Role redirects:

```text
EMPLOYEE -> /dashboard/employee
MANAGER -> /dashboard/manager
HR_ADMIN -> /dashboard/hr-admin
```

Protected routes redirect unauthenticated users to `/login`. Role mismatches redirect to `/unauthorized`. On refresh, the app reads the stored token and confirms the session through `GET /api/auth/me`.
