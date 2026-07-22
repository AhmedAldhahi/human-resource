<div align="center">

# ⚡ Enterprise HRMS Platform

**A Next-Generation, Full-Stack Human Resource Management System**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Nx](https://img.shields.io/badge/Nx_Monorepo-14171F?style=for-the-badge&logo=nx&logoColor=white)

---

</div>

## 🌟 Overview

The **Enterprise HRMS Platform** is a powerful, modern, monorepo-backed Human Resource Management solution built with **NestJS**, **React 19**, **Prisma ORM**, and **Nx**. Designed for high aesthetics and real-time collaboration, it provides complete organizational governance across employee profiles, presence/attendance tracking, card issuance, payroll, real-time messaging, and audit logging.

---

## 🎨 Key Features

- 💎 **Vibrant Multi-Theme System**: Live UI theme switcher featuring 4 vibrant presets (**Neon Cyber**, **Sunset Flame**, **Aurora Emerald**, and **Violet Pulse**) with dynamic glassmorphism and CSS custom property design tokens.
- 🔐 **Role-Based Security**: Strict JWT-based authentication supporting **Admin**, **HR**, and **Employee** privilege levels.
- 👥 **Employee Governance**: Complete directory, attendance logs, absence requests, wage calculations, and profile customization.
- 💳 **Smart Card System**: Issue, manage, and audit RFID/NFC employee cards.
- 💬 **Real-Time Communication**: Instant messaging and presence detection powered by **Socket.io**.
- 📈 **Payroll & Audit Logs**: Detailed salary processing and immutable system audit logging.
- 🖥️ **PC Tracker Integration**: Monitor system activity and computer hardware usage.

---

## 🛠️ Tech Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TailwindCSS, Chart.js, React Router v6, Socket.io Client |
| **Backend** | NestJS, Passport.js JWT, WebSockets, Prisma ORM, Express |
| **Database** | PostgreSQL (Supabase Pooler / Managed DB) |
| **Workspace** | Nx Monorepo (`apps/api`, `apps/web`, `libs/shared`) |

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js**: `v18.x` or `v20.x` (Recommended: `v20.10.0+`)
- **npm**: `v9.x` or `v10.x`
- **PostgreSQL Database**: A running local instance or a cloud database (e.g. Supabase).

---

## ⚙️ Environment Setup

Create a `.env` file in the project root directory (`hrms/.env`):

```env
# Database Connections
DATABASE_URL="postgresql://postgres:password@localhost:5432/hrms?pgbouncer=true"
DIRECT_URL="postgresql://postgres:password@localhost:5432/hrms"

# JWT Authentication
JWT_SECRET="hrms-super-secret-jwt-key-change-in-production"

# External APIs & Integration
TRACKER_API_URL="https://voadera-analytics-api.onrender.com"
TRACKER_ADMIN_PASSWORD="YourTrackerAdminPassword"
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Timezone Configuration
TIMEZONE="Asia/Riyadh"
```

---

## 🚀 How to Run the Application

You can launch both the **Frontend** and **Backend** simultaneously with a single command!

### 1️⃣ Run Both Frontend & Backend (Recommended)

To start both the NestJS API (Backend) and React Vite App (Frontend) in development mode:

```bash
npm run dev
```

> ⚡ **Access URLs**:
> - **Frontend (Web App)**: `http://localhost:4200`
> - **Backend API**: `http://localhost:3000/api`

---

### 2️⃣ Run Frontend or Backend Individually

If you prefer to run services in separate terminal windows:

#### Start Backend API Only:
```bash
npm run dev:api
```

#### Start Frontend Web App Only:
```bash
npm run dev:web
```

---

## 🗄️ Database Setup & Management (Prisma)

To initialize, migrate, or seed the database:

```bash
# 1. Generate Prisma Client
npm run db:generate

# 2. Run Database Migrations
npm run db:migrate

# 3. Seed Initial Demo Data (Admin & Employee accounts)
npm run db:seed
```

---

## 🏗️ Project Architecture

```
hrms/
├── apps/
│   ├── api/                  # NestJS Backend Application
│   │   ├── prisma/           # Database Schema & Seed Data
│   │   └── src/              # Controllers, Services, Auth & WebSockets
│   └── web/                  # React 19 + Vite Frontend Application
│       └── src/
│           ├── components/   # UI Components & Theme Switcher
│           ├── context/      # Auth, Chat & Vibrant Theme Contexts
│           ├── pages/        # Dashboard, Employees, Payroll, Chat
│           └── styles.css    # CSS Variable Design Tokens & Themes
├── libs/
│   └── shared/               # Shared DTOs, Enums, Interfaces & Types
├── nx.json                   # Nx Monorepo Configuration
└── package.json              # Scripts & Dependencies
```

---

## 📄 License & Ownership

Copyright © 2026 **Ahmed Aldhahi**. All Rights Reserved.  
PROPRIETARY AND CONFIDENTIAL.
