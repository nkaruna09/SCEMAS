# SCEMAS

Smart City Environmental Monitoring and Alert System — McMaster SE 3A04, Group T01-G3.

Front-end: Next.js 
Back-end: Supabase, FastAPI

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once ready, go to **Settings → API** and copy your Project URL, publishable key, and service role key

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Settings → API → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role key (reveal it) |
| `SENSOR_API_KEY` | Generate with `openssl rand -base64 32` |

### 4. Initialize the database

In your Supabase project, go to **SQL Editor** and run the entire contents of `supabase/schema.sql`.

### 5. Disable email confirmation (development)

In Supabase: **Authentication → Providers → Email** → turn off **Confirm email**.

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up — you'll be assigned `system_admin` automatically.

## Roles

| Role | Dashboard path |
|---|---|
| City Operator | `/city-operator` |
| System Admin | `/system-admin` |
| Government Official | `/government` |
| Emergency Services | `/emergency` |

To change a user's role, update their row in the `user_roles` table via the Supabase Table Editor.

## Other commands

```bash
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type-check
```
