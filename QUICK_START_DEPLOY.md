# Quick Start: Deploy in 15 Minutes

This is a fast-track guide. For detailed instructions, see `DEPLOYMENT.md`.

---

## Prerequisites
- ✅ Supabase account
- ✅ Vercel account (free tier OK)
- ✅ GitHub with this repository

---

## 1. Supabase Setup (3 minutes)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Enter name: `haggle`, pick region
3. Go to **SQL Editor** → paste SQL from `DEPLOYMENT.md` Phase 1 Step 2
4. Execute the SQL
5. Go to **Settings → API**, copy:
   - Project URL → save as `SUPABASE_URL`
   - Anon key → save as `SUPABASE_ANON_KEY`

---

## 2. Generate JWT Secret

```bash
openssl rand -base64 32
# Copy output → save as JWT_SECRET
```

---

## 3. Vercel Backend (5 minutes)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Click **Environment Variables**
4. Add (from steps above):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET` (from openssl command)
   - `OPENAI_API_KEY` (or skip for testing)
5. Click **Deploy**
6. Wait for "Domains" to show in preview
7. Copy backend URL like `https://haggle.vercel.app`

---

## 4. Vercel Frontend (5 minutes)

1. Go to [vercel.com/new](https://vercel.com/new) again
2. Import same GitHub repo
3. Click **Environment Variables**
4. Add:
   - `VITE_API_URL` = `https://haggle.vercel.app` (from step 3)
5. Click **Deploy**
6. Get frontend URL from preview

---

## 5. Test

Visit frontend URL and:
- [ ] Register account
- [ ] Create project
- [ ] Send message (if OpenAI key set)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 500 error | Check Vercel env vars are set |
| Can't register | Check Supabase tables exist |
| "Can't reach server" | Make sure `VITE_API_URL` is set in frontend |
| Messages fail | Add `OPENAI_API_KEY` to backend env |

Check `DEPLOYMENT_CHECKLIST.md` for more help.

---

## What's Different?

- ✅ Database moved from local file to cloud (Supabase)
- ✅ Backend runs on serverless functions (Vercel)
- ✅ Frontend deployed automatically (Vercel)
- ✅ No server to manage or keep running
- ✅ Scales automatically with users

---

## Next Steps

1. Add custom domain (optional)
2. Set up backups in Supabase
3. Monitor logs regularly
4. Add error tracking (Sentry, etc.)

Detailed guides in `DEPLOYMENT.md`
