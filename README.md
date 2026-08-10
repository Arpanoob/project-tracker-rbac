# Project Tracker — Role-Based Access Control

A full-stack project tracker that demonstrates a real Role-Based Access Control (RBAC) implementation. Teams organise work into **projects** and **tasks**, and what each person can do depends on their role.

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT stored in an `httpOnly` cookie, passwords hashed with bcrypt

---

## Roles & Permissions

| Capability | Admin | Manager | Member |
| --- | :---: | :---: | :---: |
| Log in / view own dashboard | ✓ | ✓ | ✓ |
| Manage users (create, edit role, delete) | ✓ | — | — |
| Create projects | ✓ | ✓ | — |
| Edit / delete a project | any | own | — |
| Add / remove project members | any | own | — |
| Create / assign / delete tasks | any | own project | — |
| Update the status of a task | any | own project | if assigned to them |
| View a project & its tasks | all | owned + member | member only |

The design deliberately combines two layers of authorization:

1. **Role checks** — declarative `@Roles(...)` guard on controllers (e.g. only `ADMIN` reaches `/users`).
2. **Ownership / membership checks** — enforced in the service layer where the record is available (e.g. a Manager may only touch projects they own; a Member may only change the status of tasks assigned to them).

---

## Project Structure

```
.
├── backend/                     # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma        # data model
│   │   └── seed.ts              # demo users + sample data
│   └── src/
│       ├── auth/                # login/logout/me, JWT strategy
│       ├── users/               # user CRUD (admin) + directory
│       ├── projects/            # project CRUD + membership
│       ├── tasks/               # task CRUD + status updates
│       ├── common/              # @Roles/@Public decorators, guards, exception filter
│       └── prisma/              # PrismaService
├── frontend/                    # Next.js app
│   └── src/
│       ├── app/
│       │   ├── login/           # public login page
│       │   └── (dashboard)/     # protected pages: dashboard, projects, tasks, users
│       ├── components/          # app shell, modal, task form, task item
│       ├── lib/                 # api client, auth context, types
│       └── middleware.ts        # route protection + admin-only gating
└── docker-compose.yml           # local PostgreSQL
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL (or Docker to run the bundled one)

### 1. Start PostgreSQL

Using Docker:

```bash
docker compose up -d
```

Or point the backend at any Postgres instance you already have (see `DATABASE_URL` below).

### 2. Backend

```bash
cd backend
cp .env.example .env          # adjust DATABASE_URL / JWT_SECRET if needed
npm install
npm run prisma:generate
npm run prisma:migrate        # creates the schema
npm run db:seed               # loads demo accounts + sample data
npm run start:dev             # API on http://localhost:4000/api
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env          # NEXT_PUBLIC_API_URL defaults to the backend above
npm install
npm run dev                   # app on http://localhost:3000
```

Open http://localhost:3000 and sign in.

---

## Demo Accounts

All accounts share the password **`Password123!`** (buttons on the login page fill them in for you).

| Role | Email |
| --- | --- |
| Admin | `admin@tracker.dev` |
| Manager | `manager@tracker.dev` |
| Member | `member@tracker.dev` |
| Member | `liam@tracker.dev` |

Try logging in as each role to see the navigation, pages, and available actions change.

---

## Tests

The backend ships with an end-to-end test suite (Jest + Supertest) that boots the real Nest application and asserts every RBAC rule over HTTP — role checks *and* ownership checks.

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rbac_tracker_test?schema=public" \
  npm run test:e2e
```

Point `DATABASE_URL` at a **separate test database** (the suite wipes tables between cases). `npm run test:e2e` applies migrations first, then runs the specs. Coverage includes:

- Authentication — no session → 401, wrong password → 401, `/auth/me` never leaks the password hash.
- User management — only Admin may list/create; payload validation and unknown-property rejection; an admin cannot delete their own account.
- Projects — Managers create, Members cannot; non-members cannot view; listing is scoped to what the caller can access.
- Tasks & ownership — Members can update only the *status* of tasks assigned to them (not other fields, not other people's tasks); the owning Manager and Admin have full control.

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:

- **Backend** — spins up a PostgreSQL service, installs dependencies, generates the Prisma client, builds, applies migrations, and runs the e2e RBAC suite.
- **Frontend** — installs dependencies and runs a production build.

Both jobs use `npm ci` against the committed lockfiles, so CI installs are reproducible.

## API Overview

All routes are prefixed with `/api`. Every route except `POST /auth/login` requires a valid session cookie.

| Method & Path | Description | Allowed roles |
| --- | --- | --- |
| `POST /auth/login` | Log in, sets the auth cookie | public |
| `POST /auth/logout` | Clear the session | any |
| `GET /auth/me` | Current user | any |
| `GET /users` | List users | Admin |
| `GET /users/directory` | Minimal user list for assignment | Admin, Manager |
| `POST /users` | Create user | Admin |
| `PATCH /users/:id` | Update user | Admin |
| `DELETE /users/:id` | Delete user | Admin |
| `GET /projects` | Projects visible to the caller | any |
| `GET /projects/:id` | Project detail | member+ |
| `POST /projects` | Create project | Admin, Manager |
| `PATCH /projects/:id` | Update project | owner / Admin |
| `DELETE /projects/:id` | Delete project | owner / Admin |
| `POST /projects/:id/members` | Add a member | owner / Admin |
| `DELETE /projects/:id/members/:userId` | Remove a member | owner / Admin |
| `GET /tasks` | Tasks visible to the caller (`?projectId=`) | any |
| `POST /tasks` | Create task | Admin, Manager (own project) |
| `PATCH /tasks/:id` | Update task / status | owner / Admin, or assignee (status only) |
| `DELETE /tasks/:id` | Delete task | owner / Admin |

---

## Security Notes

- Passwords are hashed with bcrypt and never returned by the API.
- The JWT is stored in an `httpOnly`, `sameSite=lax` cookie, so it is not readable by client-side JavaScript.
- Every request body is validated with `class-validator` DTOs; unknown properties are rejected.
- A global exception filter returns consistent error shapes and hides internal error details.
- Authorization is always enforced on the server. The UI hides actions a role cannot perform, but the API is the source of truth.
