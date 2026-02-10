# Archived Migrations

This directory contains migrations from the initial development phase (January 2024). These migrations have been **consolidated into `supabase/bootstrap.sql`** and are archived here for historical reference only.

## Archived Migrations (2024-01-01 through 2024-01-09)

| Migration | Description | Date |
|-----------|-------------|------|
| 20240101000000 | Initial schema (all core tables, indexes, RLS) | 2024-01-01 |
| 20240102000000 | User auto-creation trigger | 2024-01-02 |
| 20240103000000 | Last login tracking | 2024-01-03 |
| 20240104000000 | Management RLS policies | 2024-01-04 |
| 20240105000000 | Match multiplier (DECIMAL) | 2024-01-05 |
| 20240106000000 | Fix multiplier type (INTEGER) | 2024-01-06 |
| 20240107000000 | Reset prediction scores (data migration) | 2024-01-07 |
| 20240108000000 | Create rankings view | 2024-01-08 |
| 20240109000000 | Drop rankings table, finalize view | 2024-01-09 |

**All of these changes are included in `../../bootstrap.sql`.**

## Why Archive?

- **Fresh installations** should use `bootstrap.sql` (faster, single-file setup)
- **Production databases** have already applied these migrations
- **Future migrations** will build on the WebAuthn/admin foundation (2026-01-19 onwards)
- **Historical value** preserved for understanding project evolution

## Do I Need These Files?

- **Fresh setup?** No - use `bootstrap.sql`
- **Existing database?** No - these migrations are already applied
- **Debugging or research?** Yes - these files document initial design decisions
