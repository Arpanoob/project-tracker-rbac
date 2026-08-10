# Project Tracker — Role-Based Access Control

A full-stack project tracker that demonstrates a real Role-Based Access Control (RBAC) implementation. Teams organise work into **projects** and **tasks**, and what each person can do depends on their role.

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT stored in an `httpOnly` cookie, passwords hashed with bcrypt. New users are onboarded by **email invite** (they set their own password), with a **forgot-password** reset flow.

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

## Deployment (free hosting)

The app runs entirely on free tiers: **Vercel** (frontend), **Render** (backend), and **Neon** (PostgreSQL).

### 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string (it looks like `postgresql://user:pass@ep-xxx.aws.neon.tech/dbname?sslmode=require`).

### 2. Backend — Render

Render reads `render.yaml`, so you can deploy it as a Blueprint:

1. Push this repo to GitHub, then in Render choose **New → Blueprint** and pick the repo.
2. Set the two secret env vars when prompted:
   - `DATABASE_URL` — the Neon connection string from step 1.
   - `CLIENT_ORIGIN` — your Vercel URL (e.g. `https://your-app.vercel.app`). You can fill this after step 3 and redeploy.
3. Render builds, runs `prisma migrate deploy`, and starts the API. Seed the demo data once from the service **Shell**: `npm run db:seed`.

The backend URL will look like `https://rbac-tracker-api.onrender.com`. The free instance sleeps after ~15 min idle, so the first request after a pause takes ~30–50s to wake.

### 3. Frontend — Vercel

1. In Vercel, **Import** the repo and set the **Root Directory** to `frontend`.
2. Add one environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://rbac-tracker-api.onrender.com/api`
3. Deploy. Then go back to Render and make sure `CLIENT_ORIGIN` matches the deployed Vercel domain exactly, and redeploy the backend.

### Why the production cookie settings differ

In production the frontend and backend live on different domains, so the auth cookie is issued with `SameSite=None; Secure` and CORS is locked to `CLIENT_ORIGIN` with credentials enabled. Locally (same `localhost`) it stays `SameSite=Lax`. `trust proxy` is enabled in production so the `Secure` cookie is honoured behind Render's proxy. No code changes are needed between environments — it keys off `NODE_ENV`.

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
| `POST /auth/forgot-password` | Request a reset link (always 200, no enumeration) | public |
| `POST /auth/set-password` | Set a password using an invite/reset token | public |
| `GET /auth/token/:token` | Check whether an invite/reset token is still valid | public |
| `GET /users` | List users | Admin |
| `GET /users/directory` | Minimal user list for assignment | Admin, Manager |
| `POST /users` | Create user (sends an invite email; no password) | Admin |
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

## Email invites & password reset

Admins create users without a password. The API issues a single-use, SHA-256-hashed token
(72h for invites, 1h for resets), emails a link, and the user sets their own password via
`POST /auth/set-password`. Forgot-password works the same way and always returns 200 so it
cannot be used to probe which emails exist.

Email delivery is abstracted behind a `MailService` with a swappable transport, configured via
these backend env vars (see `backend/.env.example`):

| Var | Purpose |
| --- | --- |
| `MAIL_TRANSPORT` | `log` prints the link to the console (great for local dev); `smtp` sends for real. **Never use `log` in production.** |
| `MAIL_FROM` | Sender address — must be a **verified sender** in your provider (e.g. Brevo). |
| `SMTP_HOST` / `SMTP_PORT` | SMTP relay (Brevo: `smtp-relay.brevo.com` / `587`). |
| `SMTP_USER` | SMTP login. |
| `SMTP_PASS` | SMTP password/key. Falls back to `BREVO_SMTP_Key` when blank. |

The e2e suite always forces `MAIL_TRANSPORT=log`, so tests never make network calls.

## Security Notes

- Passwords are hashed with bcrypt and never returned by the API.
- Invite/reset tokens are stored only as SHA-256 hashes; the raw token lives solely in the email link and is single-use.
- The JWT is stored in an `httpOnly`, `sameSite=lax` cookie, so it is not readable by client-side JavaScript.
- Every request body is validated with `class-validator` DTOs; unknown properties are rejected.
- A global exception filter returns consistent error shapes and hides internal error details.
- Authorization is always enforced on the server. The UI hides actions a role cannot perform, but the API is the source of truth.

---

## Assumptions & Design Decisions

- **Two-layer authorization by design.** Role checks are declarative (`@Roles(...)` guard on
  controllers), while ownership/membership rules are enforced in the service layer where the
  record is loaded (e.g. a Manager may only edit projects they own; a Member may only change the
  status of tasks assigned to them). This keeps coarse role gating separate from fine-grained,
  data-dependent rules.
- **JWT in an httpOnly cookie, not localStorage.** This protects the token from XSS. The
  middleware reads the cookie for route protection; the API remains the source of truth.
- **Server is authoritative; the UI is only a convenience.** The frontend hides actions a role
  can't perform, but every request is independently authorized on the backend — hiding a button
  is never treated as security.
- **Invite-based onboarding instead of admin-set passwords.** Admins create users with only
  name/email/role; the user sets their own password via a single-use, SHA-256-hashed email token
  (72h invites, 1h resets). Admins never know a user's password. A forgot-password flow reuses the
  same token primitive and never reveals whether an email exists (no user enumeration).
- **Email is abstracted behind a swappable transport.** `MAIL_TRANSPORT=log` prints links to the
  console for local dev and tests (no network); `smtp` sends via Nodemailer/Brevo in production —
  changing provider is an env-var change, not a code change.
- **Prisma + PostgreSQL** for a typed schema, explicit relations, and migration history. `onDelete`
  rules keep referential integrity (e.g. deleting a project cascades its tasks; deleting an
  assignee nulls the task's `assigneeId`).
- **Roles are fixed** (`ADMIN`, `MANAGER`, `MEMBER`) rather than a dynamic permissions table —
  appropriate for the assessment's scope and far easier to reason about and test. A
  permissions-per-role table would be the next step if roles needed to be user-configurable.
- **Same codebase for all environments.** Cookie/CORS behavior keys off `NODE_ENV` (`SameSite=Lax`
  locally, `SameSite=None; Secure` + `trust proxy` in production) so no code changes are needed
  between local and deployed setups.
