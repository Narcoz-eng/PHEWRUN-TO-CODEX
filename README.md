# Just a Phew

A high-end SocialFi platform where users are ranked based on their crypto call accuracy. "Just a Phew running the internet."

## Features

### Authentication
- **Privy Integration**: Login via Phantom Wallet (Solana) or Email
- **Unique Usernames**: New users must choose a unique username (enforced at database level)
- **Wallet Connection**: Connect Phantom, Solflare, or other wallets from profile settings

### Admin System & Announcements
- **Admin Role**: Special admin users with elevated permissions
- **Announcements**: Admins can create/edit/delete platform announcements
- **Pinned Announcements**: Pin important announcements to the top of the feed
- **Post Moderation**: Admins can delete any post
- **User Management**: Admins can ban/unban users
- **Admin Dashboard**: Full statistics and user/post management at `/admin`

### UI/UX & Theme
- **Dark/Light Mode**: Premium theme toggle with deep charcoal dark mode (#121212) and warm off-white light mode
- **High-End Design**: Sleek, professional aesthetic inspired by Linear, Vercel, Stripe
- **Mobile-First**: Responsive design that works perfectly on mobile and desktop
- **Skeleton Loaders**: Smooth loading states for feed and profile pages
- **Animated Comments**: Framer Motion animated comments section with smooth slide/fade
- **Clickable Profile Avatar**: Click profile picture in CreatePost to quickly edit
- **Redesigned Header**: Modern, minimalist FeedHeader with clean "Phew" branding and subtle gradient border

### Profile Dashboard
- **XP & Level Progress Bar**: Large visual progress bar showing level from -5 to +10
- **Level Color Coding**:
  - Gold (Elite): Level 8-10
  - Silver (Veteran): Level 4-7
  - Bronze (Rising): Level 1-3
  - Pale Red (At Risk): Level 0 to -2
  - Deep Red (Liquidated): Level -3 to -5
- **Statistics Dashboard**: Total Alpha Calls, Success Rate (%), Total Profit/Loss
- **Recent Trades**: Last 5 alpha calls with performance badges (W/L)
- **Wallet Connection**: Connect/disconnect wallet from profile settings
  - Supports Phantom, Solflare, or manual address entry
  - Truncated display (ABC1...xyz9)
  - Copy to clipboard functionality
- **Update Guards**:
  - Username: Can only change once every 7 days
  - Profile Photo: Can only change once every 24 hours

### XP & Leveling System
- **XP (Experience Points)**: Numerical XP gained/lost based on call performance
- **Level Range**: -5 (liquidated) to +10 (alpha god)
- **Enhanced Level Rules**:
  - **1H Settlement**: Win = +1 level, Loss >= 30% = -1 level immediately
  - **Recovery Rule**: 1H loss < 30% waits for 6H check - if 6H shows profit, +1 level (recovery bonus)
  - **Mixed Result**: Win at 1H but lose at 6H = Still +1 level (reward early alpha detection)
  - **6H Bonus**: Win at both 1H and 6H = +1 additional level
- **Advanced Level Protection Logic**:
  - **Veteran Protection**: Users at level 5+ only lose 50% XP on losses
  - **Soft Landing**: Trades with >= 40% loss only lose 50% XP (prevents discouragement from "nukes")
  - **Soft Loss**: Trades with < 30% loss only lose 50 XP (half a level)
- **Global Settlement Logic**: Automatic background settlement that ensures ALL users see settled trades
  - Background check runs on every feed fetch (non-blocking)
  - Processes unsettled posts older than 1 hour
  - Fetches final market cap from Dexscreener
  - Updates user XP and level immediately
  - Creates settlement notification for post author
- **6H Market Cap Snapshot**: All posts get a 6H mcap snapshot once they're 6 hours old
- **Liquidation**: At level -5, users cannot post (form locked with warning message)

### Market Cap Tracking
- **Dual Tracking Modes**:
  - **Active Mode** (First Hour): Updates every 30 seconds
  - **Settled Mode** (After 1H): Updates every 5 minutes
- **Data Points**: Entry MC, 1H MC, 6H MC, Current MC
- **Profit/Loss Colors**:
  - Green background for profits vs entry
  - Red background for losses vs entry
- **DexScreener Integration**: Real-time market cap data with rate limiting

### Feed Features
- **Feed Hierarchy** (top to bottom):
  1. Pinned Admin Announcements
  2. Trending Now Section (if tokens have 50+ callers)
  3. Search Bar
  4. Filter Tabs (Latest/Trending/Following)
  5. Regular Feed
- **Search & Filter**: Search across token names, symbols, content, and usernames
- **Trending Section**: Horizontal scrollable cards for tokens with 50+ unique callers

### Rate Limits
- **Posting Limit**: Maximum 10 posts per 24 hours
- **Comment Limit**: Maximum 15 comments per 24 hours
- **Repost Limit**: Maximum 10 reposts per 24 hours
- **Wallet Connect Limit**: Maximum 5 connect/disconnect operations per hour
- **Reset Timer**: Shows hours until limit resets when exceeded

### Feed Intelligence
- **Latest**: Chronological feed
- **Trending**: Sorted by biggest percentage gains from past 7 days (gainers rise to top)
- **Following**: Posts from users you follow

### Social Features
- **Likes**: Heart button with count
- **Comments**: Expandable comment section with animated slide/fade
- **Reposts**: Save/share posts to your profile (private, not shown in global feed)
- **Follow/Unfollow**: Follow other traders with optimistic updates
- **Also Called By**: Shows other users who called the same token within 48 hours
- **Shared by X others**: Clickable badge showing who reposted

### Notifications
- **Notification Types**:
  - **Likes**: "[User] liked your Alpha!"
  - **Reposts**: "[User] reposted your Alpha!"
  - **Settlement**: "WIN! +X.X% | Level +1" or "LOSS: -X.X% | Level -1"
  - **Follow**: "[User] followed you!"
  - **Level Up**: Level change notifications
- **Improvements**:
  - No auto-redirect when clicking notifications
  - Dismiss button (X) on each notification
  - Expand to view details inline
  - "View Post" button only shown when post exists
  - Type-specific icons (Heart, TrendingUp, Award, etc.)
- **Notification Bell**: Badge showing unread count in header

### Post Detail Page
- **Direct Link**: `/post/:postId` route for sharing individual posts
- **Full Post View**: Complete post with all interactions
- **Deep Linking**: Notifications link directly to posts

### Post Features
- **Character Limit**: 10-400 characters
- **CA Required**: Posts MUST contain a valid contract address
- **Clean CA Display**:
  - CA removed from post content
  - Token info card with image, name, symbol
  - Single copy button with truncated address
- **Token Auto-Enrichment**: Fetches token metadata from DexScreener
- **Entry Mcap Display**: Shows market cap at time of posting
- **Real-Time Price Updates**: Current market cap updates based on tracking mode
- **View on Dexscreener**: Prominent button to view token on Dexscreener
- **Chain Detection**: Automatic Solana/EVM chain detection

### Leaderboard (`/leaderboard`)
- **Daily Top Gainers**: Top 10 alphas by percentage gain today
- **Top Users**: Paginated list ranked by level and win rate
- **Platform Statistics**:
  - Trading volume (24h, 7d, 30d, all-time)
  - Alpha counts (today/week/month)
  - Average win rate
  - Active users
  - Level distribution chart
  - Top 5 most active users this week

### Wallet Connection
- **Native Wallet Integration**: Connect via Privy with signature verification
- **Supported Wallets**: Phantom, Solflare, and other Solana/EVM wallets
- **Ownership Verification**: Sign message to prove wallet ownership
- **Manual Entry**: Option to enter address manually (unverified)
- **Profile Display**: Shows connected wallet with provider badge

### Dashboards
- **User Profile**: Edit username, bio, profile picture, wallet; view stats
- **Admin Dashboard**: Monitor platform stats, manage users and posts, create announcements
- **Leaderboard**: Users ranked by highest level (with XP as tiebreaker)

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Hono + Bun + Prisma (SQLite)
- **Auth**: Privy (Phantom Wallet + Email)
- **Design**: Dark/Light theme with Sora (headers) + Inter (body) fonts

## API Endpoints

### Authentication
- `POST /api/auth/sync` - Sync Privy user with database

### Posts
- `GET /api/posts` - Get feed (query: sort, following, search)
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get single post
- `POST /api/posts/settle` - Settle eligible posts
- `GET /api/posts/trending` - Get trending tokens (50+ unique callers)
- `POST /api/posts/:id/like` - Like post
- `DELETE /api/posts/:id/like` - Unlike post
- `POST /api/posts/:id/repost` - Repost
- `DELETE /api/posts/:id/repost` - Unrepost
- `GET /api/posts/:id/reposters` - Get users who reposted
- `GET /api/posts/:id/shared-alpha` - Get users who posted same CA within 48 hours
- `GET /api/posts/:id/price` - Get real-time price update
- `GET /api/posts/:id/comments` - Get comments
- `POST /api/posts/:id/comments` - Add comment
- `DELETE /api/posts/:id/comments/:commentId` - Delete comment
- `POST /api/posts/:id/view` - Increment view count

### Users
- `GET /api/me` - Get current user
- `PATCH /api/users/me` - Update profile
- `GET /api/users/me/wallet` - Get wallet status
- `POST /api/users/me/wallet` - Connect wallet
- `DELETE /api/users/me/wallet` - Disconnect wallet
- `GET /api/users` - Get leaderboard
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/posts` - Get user's posts
- `GET /api/users/:id/reposts` - Get user's reposts
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user
- `GET /api/users/:id/followers` - Get followers
- `GET /api/users/:id/following` - Get following

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/:id/click` - Mark as clicked
- `PATCH /api/notifications/:id/dismiss` - Dismiss notification
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Announcements
- `GET /api/announcements` - Get pinned announcements (public)
- `GET /api/announcements/:id` - Get single announcement
- `POST /api/announcements/:id/view` - Mark as viewed

### Leaderboard
- `GET /api/leaderboard/daily-gainers` - Top 10 daily gainers
- `GET /api/leaderboard/top-users` - Paginated top users
- `GET /api/leaderboard/stats` - Platform statistics

### Admin
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - List users (paginated, searchable)
- `GET /api/admin/posts` - List posts (paginated, filterable)
- `DELETE /api/admin/posts/:id` - Delete any post
- `POST /api/admin/users/:id/ban` - Ban/unban user
- `GET /api/admin/announcements` - List all announcements
- `POST /api/admin/announcements` - Create announcement
- `PATCH /api/admin/announcements/:id` - Update announcement
- `DELETE /api/admin/announcements/:id` - Delete announcement
- `POST /api/admin/announcements/:id/pin` - Toggle pin status

## Project Structure

```
webapp/                 # Frontend React app
  src/
    components/
      feed/             # Feed components (PostCard, CreatePost, LevelBar, etc.)
      admin/            # Admin components (AnnouncementManager, etc.)
      leaderboard/      # Leaderboard components
      notifications/    # Notification components
      profile/          # Profile components (WalletConnection, etc.)
      ui/               # shadcn/ui components
    pages/              # Route pages (Feed, Login, Profile, Leaderboard, Admin, etc.)
    lib/                # Utilities (api, auth-client, level-utils)
    types/              # TypeScript types

backend/                # Hono API server
  src/
    routes/             # API routes (posts, users, notifications, admin, announcements, leaderboard)
    middleware/         # Auth, rate limiting, security, sanitization
    services/           # Business logic (marketcap, etc.)
    types.ts            # Shared types & Zod schemas
  prisma/
    schema.prisma       # Database schema
```

## Environment Variables

### Frontend (.env)
```
VITE_BACKEND_URL=http://localhost:3000
VITE_PRIVY_APP_ID=your-privy-app-id
```

### Backend (.env)
```
DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@db.<YOUR_PROJECT_REF>.supabase.co:5432/postgres
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
NODE_ENV=development
```
For local SQLite, set `DATABASE_URL=file:./dev.db` and use the SQLite scripts below.

## Database Setup (Step-by-Step)

### Option A: Supabase (PostgreSQL) — Recommended for deployments
This is the default Prisma schema for production builds.

1) **Create a Supabase project**
   - Go to **Supabase Dashboard → Project → Settings → Database**.
   - Copy the **Connection string (URI)**.

2) **Set the backend `DATABASE_URL`**
```
DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@db.<YOUR_PROJECT_REF>.supabase.co:5432/postgres
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
NODE_ENV=development
```

3) **Generate + push the PostgreSQL Prisma schema**
```bash
cd backend
npm run db:generate:postgres
npm run db:push:postgres
```

If Supabase logs show something like:
```
connection authenticated: identity="supabase_admin" method=scram-sha-256
```
that only means the connection succeeded — you still need to run `db:push:postgres` to create tables.

After `db:push:postgres`, verify tables in **Supabase → Table Editor**.

4) **Start the backend**
```bash
npm run dev
```

5) **Point the frontend at the backend**
```
VITE_BACKEND_URL=http://localhost:3000
```

> Note: This repo includes a PostgreSQL Prisma schema at `backend/prisma/schema.postgres.prisma` for Supabase.

### Option B: Local SQLite (dev-only, no hosted DB)
Use this if you want a local database while developing.

1) **Create your backend env**
```
DATABASE_URL=file:./dev.db
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
NODE_ENV=development
```

2) **Generate and push the SQLite schema**
```bash
cd backend
npm run db:generate:sqlite
npm run db:push:sqlite
```

3) **Start the backend**
```bash
npm run dev
```

4) **Point the frontend at the backend**
```
VITE_BACKEND_URL=http://localhost:3000
```

If the UI says “Failed to fetch” or “Failed to load posts,” it usually means the backend is not running or `VITE_BACKEND_URL` points to the wrong place.

### If `npm run` doesn't show `db:generate:postgres`
If `npm run` only shows `db:generate` / `db:push`, your local checkout is missing the latest scripts.

1) **Pull the latest code**
```bash
git pull origin main
```

2) **Try the scripts again**
```bash
cd backend
npm run db:generate:postgres
npm run db:push:postgres
```

You can also run the same commands from the repo root:

```bash
npm run db:generate:postgres
npm run db:push:postgres
```

If you still don't see the scripts, run Prisma directly with the Postgres schema:

```bash
cd backend
npx prisma@6 generate --schema ./prisma/schema.postgres.prisma
npx prisma@6 db push --schema ./prisma/schema.postgres.prisma
```

If you get **"file or directory not found"** for the schema path, check that the file exists:

```bash
cd backend
ls prisma
```

You should see `schema.postgres.prisma`. If you don't, pull the latest code:

```bash
git pull origin main
```

If you prefer to run the Prisma commands from the repo root, use the full path:

```bash
npx prisma@6 generate --schema ./backend/prisma/schema.postgres.prisma
npx prisma@6 db push --schema ./backend/prisma/schema.postgres.prisma
```

## Troubleshooting (Prisma P1012 / Prisma 7 error)

If you see this error:

```
Error: Prisma schema validation (P1012)
The datasource property `url` is no longer supported in schema files...
Prisma CLI Version: 7.x
```

It means a **global Prisma 7 CLI** is being used. This repo is pinned to **Prisma 6**.  
Use the project scripts (they force Prisma 6) instead of a global Prisma:

```bash
cd backend
npm run db:generate
npm run db:push
```

If you are using local SQLite, run:

```bash
npm run db:generate:sqlite
npm run db:push:sqlite
```

If you must run Prisma manually, use:

```bash
npx prisma@6 generate
```

## Backend URL vs Supabase URL (quick sanity check)

- **Backend URL** = where your API is running (example: `https://phewrun-to-codex.vercel.app`)  
  → put this in `webapp/.env` as `VITE_BACKEND_URL`.

- **Supabase project URL** (example: `https://fkyehqefcqgnxwfpopnn.supabase.co`)  
  → **not** used as `VITE_BACKEND_URL`.  
  → only used to build your **DATABASE_URL** connection string for Prisma.

## Redeploy Checklist (Vercel + Supabase)

1) **Set Vercel env vars (Backend)**
```
DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@db.fkyehqefcqgnxwfpopnn.supabase.co:5432/postgres
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
NODE_ENV=production
BACKEND_URL=https://phewrun-to-codex.vercel.app
```

2) **Set Vercel env vars (Frontend)**
```
VITE_BACKEND_URL=https://phewrun-to-codex.vercel.app
VITE_PRIVY_APP_ID=your-privy-app-id
```

3) **Apply the Prisma schema to Supabase**
```bash
cd backend
npm run db:generate:postgres
npm run db:push:postgres
```

4) **Trigger a Vercel redeploy**
If you changed only environment variables, use **Vercel → Deployments → Redeploy**.  
If you need a Git-triggered deploy, make a tiny commit and push:

```bash
git status -sb
git add .
git commit -m "Trigger redeploy"
git push origin main
```

5) **Verify the backend and posts API**
Open these URLs in your browser:
- `https://phewrun-to-codex.vercel.app/api/health`
- `https://phewrun-to-codex.vercel.app/api/posts`

If `/api/posts` returns a 500 error, the database schema is not applied or the `DATABASE_URL` is incorrect.

## Security Features

- **Rate Limiting**: API-wide and endpoint-specific rate limits
- **Input Sanitization**: XSS prevention, HTML stripping
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP, etc.
- **CORS**: Configured for allowed origins only
- **Request Validation**: Zod schemas for all inputs
- **Error Handling**: No stack traces in production

## Game Rules

- Starting Level: 0
- Starting XP: 0
- Maximum Level: +10
- Minimum Level: -5 (liquidated)
- Settlement Times: 1H (official), 6H (snapshot)
- Win Condition: Current market cap > Entry market cap
- XP Gain: Up to +100 per winning post
- XP Loss: Up to -50 per losing post
- Level Change: Based on 1H and 6H results

## Design System

### Colors (Dark Mode)
- Background: Deep charcoal (#121212)
- Cards: Slightly elevated surface (#1a1a1a)
- Primary: Electric cyan
- Gain: Vibrant green (142 71% 45%)
- Loss: Bright red (0 84% 60%)

### Colors (Light Mode)
- Background: Warm off-white (#fafaf8)
- Cards: Pure white with subtle shadows
- Primary: Same accent color
- Gain: Deep green (142 76% 36%)
- Loss: Bright red (0 84% 60%)

### Level Colors
- Gold (Elite): Amber tones for level 8-10
- Silver (Veteran): Slate tones for level 4-7
- Bronze (Rising): Orange tones for level 1-3
- At Risk: Pale red for level 0 to -2
- Liquidated: Deep red for level -3 to -5

### Fonts
- Headers: Sora
- Body: Inter
- Code: JetBrains Mono
