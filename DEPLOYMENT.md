# Deployment Guide: Vercel + Supabase

## Overview
This guide walks you through deploying the Haggle application to production using:
- **Frontend:** Vercel (React/Vite)
- **Backend:** Vercel Serverless Functions (Node.js Express)
- **Database:** Supabase PostgreSQL

## Prerequisites

1. **Supabase Account:** [supabase.com](https://supabase.com)
2. **Vercel Account:** [vercel.com](https://vercel.com)
3. **GitHub Account:** With your Haggle repository
4. **Local Setup:** Node.js 18+ installed

---

## Phase 1: Supabase Setup

### 1. Create Supabase Project
- Go to [app.supabase.com](https://app.supabase.com)
- Click "New Project"
- Enter project name (e.g., "haggle")
- Choose region closest to your users
- Create a strong password
- Wait for provisioning (~2 minutes)

### 2. Create Database Tables
In Supabase dashboard, go to **SQL Editor** and run:

```sql
-- Users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chats table (projects and conversations)
CREATE TABLE chats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES chats(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  category TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  mode TEXT NOT NULL DEFAULT 'chat' CHECK(mode IN ('chat', 'negotiation', 'practice')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project metadata table
CREATE TABLE project_metadata (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE REFERENCES chats(id) ON DELETE CASCADE,
  item_listing TEXT,
  listed_price TEXT,
  target_price TEXT,
  max_price TEXT,
  ideal_extras TEXT,
  urgency TEXT,
  private_notes TEXT,
  seller_type TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chats_user ON chats(user_id);
CREATE INDEX idx_chats_category ON chats(user_id, category);
CREATE INDEX idx_chats_parent ON chats(parent_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_project_metadata_chat ON project_metadata(chat_id);
```

### 3. Get Supabase Credentials
In Supabase dashboard:
1. Go to **Settings → API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **Anon/Public key** → `SUPABASE_ANON_KEY`
3. Keep these safe - you'll need them for Vercel environment variables

---

## Phase 2: Backend Deployment to Vercel

### 1. Push Code to GitHub
```bash
git add .
git commit -m "feat: prepare for deployment"
git push origin main
```

### 2. Import Project to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Select "Import Git Repository"
3. Connect GitHub and select your Haggle repo
4. Click "Import"

### 3. Configure Environment Variables
In Vercel project settings:
1. Go to **Settings → Environment Variables**
2. Add the following:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `JWT_SECRET` | Generate a strong random string: `openssl rand -base64 32` |
| `OPENAI_API_KEY` | Your OpenAI API key (or TINKER/LLM keys) |

3. Click "Save"

### 4. Deploy
1. Click "Deploy" button
2. Wait for build to complete (2-3 minutes)
3. Get your backend URL: `https://your-project.vercel.app`

---

## Phase 3: Frontend Deployment to Vercel

### 1. Create New Vercel Project for Frontend
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the same GitHub repository again
3. Configure it as React/Vite project

### 2. Configure Frontend Environment Variables
In Vercel project settings:
1. Go to **Settings → Environment Variables**
2. Add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend.vercel.app` |

3. Click "Save"

## Alternative: Single Vercel Project

Instead of separate projects, you can deploy frontend and backend together in one project:

1. Use the `vercel.json` file (already included)
2. Environment variables apply to both
3. APIs route to `/api/*` endpoints
4. All other routes serve React app

---

## Phase 4: Testing

### 1. Test Backend API
```bash
curl https://your-backend.vercel.app/api/health
# Should return: {"ok":true}
```

### 2. Test Registration
```bash
curl -X POST https://your-backend.vercel.app/api/auth/register \
  -H "Content-type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

### 3. Test Frontend
Visit `https://your-frontend-url.vercel.app` and:
1. Register a new account
2. Create a project
3. Send a message (requires OpenAI API key)

---

## Phase 5: Custom Domain (Optional)

### Add Custom Domain to Vercel
1. In Vercel project settings
2. Go to **Domains**
3. Add your custom domain (e.g., `haggle.example.com`)
4. Follow DNS configuration steps
5. Wait for DNS propagation (~24 hours)

---

## Troubleshooting

### "Can't reach the server" error
- Check that `VITE_API_URL` is set correctly in frontend environment
- Verify backend is deployed successfully
- Check Vercel logs: `vercel logs https://your-backend.vercel.app`

### 500 errors on backend
1. Check environment variables are set in Vercel
2. Verify Supabase credentials are correct
3. Check Supabase database is accessible
4. View logs: `vercel logs <project-url>`

### Database connection errors
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check Supabase project is active
- Ensure tables exist in Supabase dashboard

### "Invalid query" errors
- This usually means the database abstraction layer needs updates
- Check server logs for the exact SQL query that failed
- May need to update `server/db.js` for specific query patterns

---

## Local Development

Even after deployment, you can continue developing locally:

```bash
# Terminal 1: Frontend (port 5173)
npm run dev

# Terminal 2: Backend (port 3001)
cd server && npm run dev
```

Environment setup:
1. Create `.env` in `server/` with local or Supabase variables
2. Create `.env` in root (optional, for frontend)
3. Vite proxy automatically forwards `/api/*` to `http://localhost:3001`

---

## Continuous Deployment

Vercel automatically redeploys when you:
1. Push to main branch
2. Open a pull request (previews)
3. Merge to main (production)

No manual deployment needed after initial setup!

---

## Performance Optimization

### Frontend (Vercel)
- Automatic code splitting
- Edge caching enabled
- Image optimization (if used)

### Backend (Vercel)
- Serverless functions (pay per execution)
- Cold start times ~1-2s (can optimize with Vercel Pro/Enterprise)
- See `vercel.json` for configuration

### Database (Supabase)
- Use connection pooling if needed
- Monitor query performance in Supabase dashboard
- Free tier includes 500MB storage

---

## Monitoring & Logs

### Vercel Logs
```bash
# Install Vercel CLI
npm install -g vercel

# View logs
vercel logs https://your-project.vercel.app
```

### Supabase Logs
- Dashboard → Logs section
- Monitor database queries and connections
- Alert setup available on paid tier

---

## Scaling & Upgrades

### When You Need More
- **Storage:** Upgrade Supabase plan
- **Performance:** Upgrade Vercel plan for faster cold starts
- **Users:** Both platforms scale automatically
- **Database:** Supabase handles 100K+ users easily

---

## Support Resources

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Express.js Docs:** [expressjs.com](https://expressjs.com)
- **Vite Docs:** [vitejs.dev](https://vitejs.dev)
