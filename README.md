# Quiniela - Tournament Prediction Platform

A modern web application for tournament predictions, initially designed for FIFA World Cup 2026 with support for multiple tournaments.

## Features

- **Multi-tournament support**: Run predictions for World Cup, Euro, Copa America, and more
- **Team management**: Reusable team entities across tournaments
- **Match predictions**: Submit score predictions before matches start
- **Scoring system**: Earn points based on prediction accuracy
- **Leaderboards**: Tournament-specific rankings
- **User profiles**: Customizable screen names and avatars
- **Responsive design**: Optimized for both desktop and mobile

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- A Supabase account and project

### Setup

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL migration from `supabase/migrations/20240101000000_initial_schema.sql` in the SQL Editor
   - Optionally run `supabase/seed.sql` for sample data

4. Configure environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` and add your Supabase credentials from Project Settings > API

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

## Project Structure

- `/app` - Next.js app directory (routes, pages, layouts)
- `/components` - React components organized by domain
- `/lib` - Utilities and configuration
- `/types` - TypeScript type definitions
- `/supabase` - Database migrations and seed data

## Scoring Rules

- Exact score: 10 points
- Correct winner + goal difference: 7 points
- Correct winner: 5 points
- Incorrect: 0 points

## Development

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation and development guidelines.

## Deployment

This application is optimized for deployment on Vercel's free tier.

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/quiniela-dev)

### Manual Deployment

For detailed deployment instructions, including environment variable configuration and Supabase setup, see [DEPLOYMENT.md](./DEPLOYMENT.md).

**Quick steps:**
1. Push your code to GitHub/GitLab/Bitbucket
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy and configure Supabase authentication URLs

## License

MIT
