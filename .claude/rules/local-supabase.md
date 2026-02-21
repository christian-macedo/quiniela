# Local Development with Supabase

The project supports a fully local Supabase stack via Docker, eliminating the need for a cloud project during development.

## Prerequisites

- **Docker Desktop** must be installed and running
- Node.js 20.x+ and npm 10.x+

## Quick Start

```bash
# 1. Install dependencies (includes Supabase CLI)
npm install

# 2. Start local Supabase (first run pulls Docker images, ~2-3 min)
npm run supabase:start

# 3. Get the local JWT keys (needed for .env.local)
npm run supabase:status -- -o env
# Copy the ANON_KEY and SERVICE_ROLE_KEY values from the output

# 4. Create .env.local with local credentials
# (see .env.example for the full template)
cat <<'EOF' > .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from step 3>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from step 3>
NEXT_PUBLIC_RP_NAME="Quiniela Dev"
NEXT_PUBLIC_RP_ID=localhost
NEXT_PUBLIC_RP_ORIGIN=http://localhost:3000
EOF

# 5. Apply all migrations + seed data (with test accounts)
npm run supabase:reset

# 6. Start the Next.js dev server
npm run dev
```

> **Note:** `supabase:start` applies migrations automatically, but `supabase:reset` is needed to also run the seed file that creates test accounts and sample data.

## Test Accounts

After running `supabase:reset`, these accounts are ready to use (no email confirmation needed):

| Email                   | Password      | Role  |
| ----------------------- | ------------- | ----- |
| `admin@quiniela.test`   | `password123` | Admin |
| `player1@quiniela.test` | `password123` | User  |
| `player2@quiniela.test` | `password123` | User  |

## Command Reference

| Command                   | Description                                |
| ------------------------- | ------------------------------------------ |
| `npm run supabase:start`  | Start all Docker containers                |
| `npm run supabase:stop`   | Stop containers (preserves data)           |
| `npm run supabase:reset`  | Drop DB, reapply all migrations + seed.sql |
| `npm run supabase:status` | Show status and local credentials          |

## Local Service URLs

| Service  | URL                                                       | Description              |
| -------- | --------------------------------------------------------- | ------------------------ |
| API      | `http://127.0.0.1:54321`                                  | Supabase API endpoint    |
| Studio   | `http://127.0.0.1:54323`                                  | Database admin dashboard |
| Mailpit  | `http://127.0.0.1:54324`                                  | Email testing inbox      |
| Database | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Direct DB connection     |

## Switching Between Local and Cloud

Update the Supabase variables in `.env.local` to point to either environment:

- **Local**: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` + keys from `npm run supabase:status -- -o env`
- **Cloud**: `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co` + keys from Supabase Dashboard

The `NEXT_PUBLIC_RP_*` WebAuthn variables stay the same for both (use `localhost` for local dev).

Restart the dev server after changing environment variables.
