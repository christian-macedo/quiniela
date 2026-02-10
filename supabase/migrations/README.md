# Database Migrations

⚠️ **For Existing Databases Only** ⚠️

If you're setting up a **fresh database**, use `../bootstrap.sql` instead. This directory is only for **upgrading existing installations**.

---

## Active Migrations (2026-01-19 onwards)

These migrations should be applied to **existing production databases** to upgrade them:

| Migration | Description | Date |
|-----------|-------------|------|
| 20260119000000 | WebAuthn tables (credentials, challenges) | 2026-01-19 |
| 20260119000001 | WebAuthn authentication functions | 2026-01-19 |
| 20260119000002 | Storage RLS policies (avatars, team logos) | 2026-01-19 |
| 20260119100000 | Admin permissions system | 2026-01-19 |
| 20260119100001 | Admin-only RLS policies | 2026-01-19 |
| 20260119110000 | Tournament participants enrollment | 2026-01-19 |
| 20260201000000 | Fix: Admin can score all predictions | 2026-02-01 |

---

## Archived Migrations

Early migrations (2024-01-01 through 2024-01-09) have been moved to `archive/` for historical reference. These migrations are **consolidated in `bootstrap.sql`** and should not be run on existing databases (they're already applied).

---

## Migration Workflow

### For Fresh Databases (New Supabase Projects)

```bash
# Option 1: Bootstrap (recommended for fresh setup)
psql -h localhost -p 54322 -U postgres -f supabase/bootstrap.sql

# Skip this migrations/ directory entirely
```

### For Existing Databases (Production or with data)

```bash
# Apply new migrations only
supabase db push

# Or apply specific migration
psql -h localhost -p 54322 -U postgres -f supabase/migrations/20260201000000_fix_predictions_admin_update_policy.sql
```

### Adding New Migrations

When adding schema changes:

1. **Create migration file**
   ```bash
   supabase migration new your_feature_name
   ```

2. **Write and test migration**
   ```sql
   -- Write your schema changes
   ALTER TABLE...
   CREATE INDEX...
   ```

3. **Apply to development**
   ```bash
   supabase db reset  # Fresh start
   # OR
   supabase db push   # Incremental
   ```

4. **Update bootstrap.sql**
   - Add your changes to `bootstrap.sql`
   - Update "Last updated" date
   - Test on fresh database to verify

5. **Apply to production**
   ```bash
   supabase db push --linked
   ```

This dual-track approach ensures both fresh and existing installations stay synchronized.
