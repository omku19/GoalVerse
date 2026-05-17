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
