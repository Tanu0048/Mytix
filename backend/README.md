# MyTix Backend Service

Event Ticketing Platform Backend API built with Node.js 22, Express, and PostgreSQL (Prisma ORM).

## System Overview

- Language: JavaScript (ES Modules, Node.js 22)
- Framework: Express 4
- Database: PostgreSQL with Prisma ORM (Strictly Zero Raw SQL Queries)
- Queue & Cron: pg-boss (PostgreSQL-backed job queue)
- Authentication: Argon2id password hashing, rotating JWT refresh tokens, Google OAuth2
- Security: Helmet, CORS, express-rate-limit, Zod request validation
- Logging: Winston structured JSON logs (stdout only, zero console calls)
- Documentation: Swagger UI accessible at /api/docs

## Getting Started

### 1. Prerequisites

- Node.js >= 22.0.0
- PostgreSQL database

### 2. Environment Setup

Copy the example environment configuration:

```bash
cp .env.example .env
```

Configure your DATABASE_URL and JWT secrets in .env.

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup & Seed

Generate Prisma client, deploy migrations, and run the idempotent seed script:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Running the Application

To run the API server in development mode:

```bash
npm run dev
```

To run the background worker process:

```bash
npm run dev:worker
```

The API will be available at http://localhost:5000 with Swagger documentation at http://localhost:5000/api/docs.
