# Game Development Backend

A **Express.js** REST API built with **TypeScript**, **Node.js**, and **Prisma ORM**. Supports Yarn, NPM, and PNPM.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- TypeScript support for type safety
- Prisma ORM for database management
- Express.js REST API framework
- Environment-based configuration
- Error handling middleware
- Supports Yarn, NPM, and PNPM

---

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Static type checking
- **Prisma** - ORM for database
- **PostgreSQL/MySQL/SQLite** - Database (choose one)
- **Yarn / NPM / PNPM** - Package management
- **REDIS** - Caching

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/projectgig/Game-Venture-backend
cd Game-Venture-backend
```

### 2. Install dependencies

Using Yarn:

```bash
yarn install
```

Using NPM:

```bash
npm install
```

Using PNPM:

```bash
pnpm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory and add the necessary environment variables (see [Environment Variables](#environment-variables) section).
Create a `.env.development` file for dev environment variables.
Create a `.env.local` file for local environment variables.

```env
PORT=3000
DATABASE_URL="DATABASE_URL"
NODE_ENV=development
```

### 4. Set up the database

Run the database setup commands (see [Database Setup](#database-setup) section).

```bash
npx prisma generate
npx prisma migrate dev --name initial
npx prisma db seed
```

### 5. Start the development server

Using Yarn:

```bash
yarn dev
```

Using NPM:

```bash
npm run dev
```

Using PNPM:

```bash
pnpm dev
```

## The server will start on `http://localhost:5000` by default.

## Environment Variables
