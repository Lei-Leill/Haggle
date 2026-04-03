# Vercel Deployment Guide - Updated with Security Fixes

This guide covers deploying Haggle to Vercel with all critical security and stability fixes applied.

## ✅ Recent Security Improvements (April 2026)

The following critical fixes have been implemented:

1. **CORS Restriction** - API now only accepts requests from trusted origins (localhost + your Vercel frontend)
2. **Database Health Check** - `/api/health` endpoint verifies database connectivity
3. **Startup Validation** - Server fails fast if required environment variables are missing
4. **Rate Limiting** - Auth endpoints protected against brute force attacks (10 attempts per 15 minutes)

## Prerequisites

- [ ] Supabase account: [supabase.com](https://supabase.com)
- [ ] Vercel account: [vercel.com](https://vercel.com)
- [ ] GitHub repository with the latest code (pull/update first)
- [ ] Node.js 18+ installed locally

---

## Phase 1: Supabase Setup

### 1. Create Supabase Project
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Enter project name (e.g., "haggle-prod")
4. Choose region closest to you
5. Create a strong password
6. Wait for provisioning (~2 minutes)

### 2. Run Database Migration
In Supabase dashboard, go to **SQL Editor** and run the migration from [DEPLOYMENT.md](DEPLOYMENT.md#phase-1-supabase-setup).

### 3. Get Credentials
In Supabase dashboard, go to **Settings → API** and copy:
- **Project URL** → `SUPABASE_URL`
- **Anon/Public key** → `SUPABASE_ANON_KEY`

Keep these safe—you'll need them for Vercel.

---

## Phase 2: Backend Deployment to Vercel

### 1. Push Latest Code to GitHub
```bash
git add .
git commit -m "Add security fixes: CORS, rate limiting, env validation"
git push origin master
```

### 2. Create Vercel Backend Project
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Select your Haggle GitHub repository
4. Choose **Framework: Other** (it will auto-detect Node.js)
5. Keep default build settings
6. Deploy

### 3. Set Backend Environment Variables
In Vercel dashboard, go to your backend project → **Settings → Environment Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | From Supabase Settings |
| `SUPABASE_ANON_KEY` | `eyJxxxxx...` | From Supabase Settings |
| `JWT_SECRET` | Generate new: `openssl rand -base64 32` | **Must be secure, change yearly** |
| `OPENAI_API_KEY` | `sk-xxxxx...` | Optional; use Tinker or other LLM instead |

⚠️ **Important:** These variables are now **required**. The server will fail to start if any are missing.

### 4. Verify Backend Deployment
After redeployment:
```bash
curl https://<your-backend>.vercel.app/api/health
```

Expected response (database connected):
```json
{
  "ok": true,
  "database": "connected"
}
```

If you get `"database": "disconnected"`, check:
- [ ] `SUPABASE_URL` is correct
- [ ] `SUPABASE_ANON_KEY` is correct
- [ ] Supabase project is active and accessible

---

## Phase 3: Frontend Deployment to Vercel

### 1. Create Vercel Frontend Project
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Select your Haggle GitHub repository **again** (or same project)
4. Choose **Framework: Vite**
5. Set **Output Directory: `dist`** (should auto-fill)
6. Deploy

### 2. Set Frontend Environment Variables
In Vercel dashboard, go to your frontend project → **Settings → Environment Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://<your-backend>.vercel.app` | Your backend URL from Phase 2 |

⚠️ **Critical:** Frontend uses this to know where to find the backend API.

### 3. Redeploy Frontend
After setting the environment variable, trigger a redeploy:
1. Go to **Deployments** tab
2. Click the three dots on the most recent deployment
3. Select "Redeploy"

### 4. Verify Frontend Deployment
1. Visit `https://<your-frontend>.vercel.app`
2. Try to register a test account
3. Check browser console (F12) for errors
4. Check Vercel logs: `vercel logs https://<frontend-url> --tail`

---

## CORS Configuration (New Security Feature)

The backend now restricts API access to:
- `http://localhost:5173` (local dev)
- `http://localhost:3001` (local backend)
- Your Vercel frontend URL (automatically added via `VITE_API_URL`)

If you get **CORS errors** in production:
1. Verify `VITE_API_URL` is set in Vercel frontend project
2. Check the error shows your actual frontend URL (e.g., `https://haggle-xyz.vercel.app`)
3. If using a custom domain, add it manually by contacting support or updating backend CORS list

---

## Rate Limiting (New Security Feature)

Auth endpoints (`/api/auth/register`, `/api/auth/login`) are now protected:
- **Limit:** 10 attempts per IP per 15 minutes
- **Error:** Returns `429 Too Many Requests` if exceeded

Users attempting account takeover will be rate-limited automatically.

---

## Post-Deployment Testing Checklist

- [ ] Health endpoint returns `"ok": true`
- [ ] Can register new account
- [ ] Can login with registered account
- [ ] Can create a new project
- [ ] Can send message (if LLM API key configured)
- [ ] No `CORS` errors in browser console
- [ ] No authentication errors in Vercel logs

---

## Troubleshooting

### "Missing required environment variables"
**Error:** Server fails to start.
**Fix:** Ensure these are set in Vercel:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`

### "Database connection failed"
**Error:** `/api/health` returns `"database": "disconnected"`
**Fix:**
1. Verify Supabase URL and key are correct
2. Check Supabase project is running
3. Try running migrations again

### "CORS error" in browser
**Error:** Cannot reach API from frontend.
**Fix:**
1. Verify `VITE_API_URL` is set in frontend project
2. Trigger a redeploy of the frontend
3. Check frontend URL matches what backend expects

### "Too many requests"
**Error:** Getting `429` on auth endpoints.
**Fix:** Wait 15 minutes, or use different IP/device. The rate limit resets every 15 minutes per IP.

---

## Optional: Enable Additional Monitoring

Add error tracking and performance monitoring:

1. **Error Tracking (Sentry):**
   - Create account at [sentry.io](https://sentry.io)
   - Add `SENTRY_DSN` to Vercel environment
   - Implement in code (optional, can be added later)

2. **Analytics (Vercel):**
   - Go to **Settings → Analytics** in Vercel project
   - Enable free tier to see performance metrics

---

## Custom Domain (Optional)

If you have a custom domain:
1. In Vercel, go to **Settings → Domains**
2. Add your domain
3. Follow DNS configuration instructions
4. Wait 24 hours for propagation
5. Update Vercel CORS list if backend is separate

---

## Security Best Practices

- [ ] Rotate `JWT_SECRET` every 6-12 months
- [ ] Keep Supabase API key secure (never share)
- [ ] Enable database backups in Supabase
- [ ] Monitor Vercel logs regularly
- [ ] Use strong passwords for Supabase/Vercel accounts
- [ ] Enable 2FA on both platforms

---

## Support

If issues persist:
1. Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. Review Vercel logs: `vercel logs <url> --tail`
3. Check browser DevTools Console (F12)
4. Verify all environment variables are set in Vercel dashboard
