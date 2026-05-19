# Deployment Guide (Railway)

## Prerequisites
- Railway account with an active $5/month plan
- Google Cloud project (for Google OAuth)
- Resend account (free tier, 3k emails/month)

---

## 1. Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://your-app.railway.app/api/auth/callback/google` (production)
5. Copy Client ID and Client Secret

---

## 2. Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain (or use the sandbox domain for testing)
3. Create an API key
4. Update `RESEND_FROM` to use your verified domain

---

## 3. Railway Deployment

### Create the project
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Link to your Railway project (or create new)
railway init
```

### Add PostgreSQL
In Railway dashboard: New Service → Database → PostgreSQL

### Set environment variables in Railway
```
DATABASE_URL=<auto-populated by Railway PostgreSQL plugin>
AUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=https://your-app.railway.app
AUTH_GOOGLE_ID=<from Google Cloud>
AUTH_GOOGLE_SECRET=<from Google Cloud>
RESEND_API_KEY=<from Resend>
RESEND_FROM=Scrabble <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

### Deploy
```bash
railway up
```

The `npm run build` script automatically:
1. Downloads the word dictionary (if not present)
2. Generates the Prisma client
3. Builds Next.js

### Run database migrations
```bash
railway run npm run db:migrate
```

---

## 4. Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env .env.local
# Edit .env.local with your values

# Download dictionary (already included in repo)
npm run setup

# Run migrations on local DB
npm run db:push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Generate AUTH_SECRET
```bash
openssl rand -base64 32
# or on Windows:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
