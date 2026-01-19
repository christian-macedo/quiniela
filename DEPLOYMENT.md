# Deploying Quiniela to Vercel

This guide walks you through deploying the Quiniela application to Vercel's free tier.

## Prerequisites

1. A [GitHub account](https://github.com) (or GitLab/Bitbucket)
2. A [Vercel account](https://vercel.com) (free tier is sufficient)
3. A [Supabase project](https://supabase.com) with the database schema set up

## Step 1: Prepare Your Repository

1. Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket):

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** > **"Project"**
3. Import your Git repository:
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Vercel to access your repositories if prompted
   - Select the `quiniela-dev` repository

## Step 3: Configure Project Settings

Vercel will auto-detect that this is a Next.js project. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

## Step 4: Configure Environment Variables

Add the following environment variables in the Vercel project settings:

### Required Variables

| Variable Name | Description | Where to Find |
|--------------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Supabase Dashboard > Project Settings > API > Project API keys > `anon` `public` |

To add these in Vercel:

1. In the import screen, scroll to **"Environment Variables"**
2. Add each variable:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
   - Click "Add"
3. Repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Alternatively, add them after deployment:
1. Go to your project in Vercel
2. Click **Settings** > **Environment Variables**
3. Add each variable for all environments (Production, Preview, Development)

## Step 5: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (usually 1-3 minutes)
3. Once deployed, you'll get a production URL like `https://quiniela-dev.vercel.app`

## Step 6: Configure Supabase Authentication URLs

Update your Supabase project to allow authentication from your Vercel domain:

1. Go to Supabase Dashboard > **Authentication** > **URL Configuration**
2. Add your Vercel URL to **Site URL**: `https://your-project.vercel.app`
3. Add to **Redirect URLs**:
   - `https://your-project.vercel.app/auth/callback`
   - `https://your-project.vercel.app/login`
   - `https://your-project.vercel.app/signup`

## Step 7: Verify Deployment

1. Visit your production URL
2. Test key functionality:
   - User registration and login
   - Viewing tournaments and matches
   - Submitting predictions
   - Viewing rankings

## Automatic Deployments

Vercel automatically deploys your application:

- **Production**: Every push to your main/master branch
- **Preview**: Every push to any other branch or pull request

## Vercel Free Tier Limits

The free tier includes:

- 100 GB bandwidth per month
- Unlimited projects and deployments
- Serverless function execution: 100 GB-hours per month
- Serverless function duration: 10 seconds max
- Edge middleware execution: 1 million requests per month

These limits are typically sufficient for small to medium-sized prediction tournaments.

## Custom Domain (Optional)

To use a custom domain:

1. Go to your project in Vercel
2. Click **Settings** > **Domains**
3. Add your domain and follow the DNS configuration instructions

## Troubleshooting

### Build Failures

If the build fails:

1. Check the build logs in Vercel
2. Ensure all dependencies are in `package.json`
3. Verify that `npm run build` works locally
4. Check that environment variables are set correctly

### Database Connection Issues

If you can't connect to Supabase:

1. Verify environment variables are correct
2. Check that your Supabase project is active
3. Ensure RLS (Row Level Security) policies are configured correctly
4. Check browser console for CORS errors

### Authentication Issues

If login/signup doesn't work:

1. Verify Supabase redirect URLs are configured
2. Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. Clear browser cookies and try again

## Monitoring

Monitor your deployment:

- **Analytics**: Vercel Dashboard > Analytics (available on free tier)
- **Logs**: Vercel Dashboard > Logs (function execution logs)
- **Supabase Logs**: Supabase Dashboard > Logs (database queries)

## Updating Your Deployment

To deploy updates:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Vercel will automatically rebuild and deploy your changes.

## Rolling Back

To roll back to a previous deployment:

1. Go to Vercel Dashboard > Deployments
2. Find the deployment you want to restore
3. Click the three dots menu > **"Promote to Production"**

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
