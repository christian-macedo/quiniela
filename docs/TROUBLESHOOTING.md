# Troubleshooting

## "Supabase client not initialized"

- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify environment variables are loaded (restart dev server after changes)

## Toast messages showing translation keys instead of text

- Check namespace matches feature area (e.g., `useFeatureToast('teams')` for team operations)
- Verify translation keys exist in `/messages/[locale]/[feature].json`
- For common messages, ensure you're using the `common:` prefix

## Dates showing in UTC instead of local time

- Use `formatLocalDateTime()`, `formatLocalDate()`, or `formatLocalTime()` - NOT `.toLocaleString()`
- Verify date is stored as ISO string in database

## Rankings not updating after scoring a match

- Rankings should update automatically via database view - check that `tournament_rankings` view exists
- Run query manually to verify: `SELECT * FROM tournament_rankings WHERE tournament_id = '...'`
- Check RLS policies allow reading from the view

## Images not uploading to Supabase Storage

- Verify storage buckets exist and are public (team-logos, user-avatars)
- Check bucket policies allow INSERT for authenticated users
- Verify file size is under bucket limits (default 50MB)

## "Module not found" errors in production build

- Check imports use aliases correctly (`@/lib/...` not `../../../lib/...`)
- Verify `tsconfig.json` has correct path mappings
- Clear `.next` folder and rebuild

## Auth/middleware issues (token refresh, 401/403 errors)

- See [AUTHORIZATION.md](./AUTHORIZATION.md#troubleshooting) for auth-related troubleshooting

## Client component errors about "use server"

- You're likely importing a server action in a client component
- Move server actions to separate files and import them properly
- Check that API routes are being called via fetch, not direct imports
