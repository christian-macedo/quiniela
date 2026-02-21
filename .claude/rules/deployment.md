# Deploying Quiniela to Vercel

## Prerequisites

- Git repository pushed to GitHub/GitLab/Bitbucket
- [Vercel account](https://vercel.com) (free tier sufficient)
- [Supabase project](https://supabase.com) with schema set up

## Deploy Steps

1. Import repository in Vercel (auto-detects Next.js)
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard > Project Settings > API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase Dashboard > API > anon public key
3. Click Deploy (builds in 1-3 minutes)

## Configure Supabase Auth URLs

After deployment, update Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://your-project.vercel.app`
- **Redirect URLs**:
  - `https://your-project.vercel.app/auth/callback`
  - `https://your-project.vercel.app/login`
  - `https://your-project.vercel.app/signup`

## Automatic Deployments

- **Production**: every push to main/master
- **Preview**: every push to other branches or PRs

## Custom Domain

Vercel Dashboard > Settings > Domains > add domain and follow DNS instructions.

## Rolling Back

Vercel Dashboard > Deployments > find deployment > three-dot menu > "Promote to Production".

## Troubleshooting

- **Build fails**: Check logs, verify `npm run build` works locally, confirm env vars are set
- **Can't connect to Supabase**: Verify env vars, check Supabase project is active, check RLS policies
- **Auth not working**: Verify redirect URLs in Supabase, check env vars, clear browser cookies
