# Deployment Checklist

## Pre-Deployment: Local Testing

- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `npm install && cd server && npm install && cd ..`
- [ ] Test locally:
  - [ ] Frontend: `npm run dev` (should run on http://localhost:5173)
  - [ ] Backend: `cd server && npm run dev` (should run on port 3001)
  - [ ] Can register user
  - [ ] Can create project
  - [ ] Can send message (if LLM API key configured)
- [ ] No console errors in browser
- [ ] No errors in terminal

---

## Supabase Setup (One-Time)

- [ ] Create Supabase project at [app.supabase.com](https://app.supabase.com)
- [ ] Copy credentials and save securely:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
- [ ] Run SQL migration (see DEPLOYMENT.md Phase 1 Step 2)
- [ ] Verify tables exist in Supabase dashboard
- [ ] Test Supabase connection locally by setting `.env.local`:
  ```
  SUPABASE_URL=<your-url>
  SUPABASE_ANON_KEY=<your-key>
  JWT_SECRET=test-secret-local
  OPENAI_API_KEY=<your-key>
  ```

---

## Vercel Setup (One-Time)

### Backend Deployment
- [ ] Create Vercel account at [vercel.com](https://vercel.com)
- [ ] Connect GitHub repository
- [ ] Create new project for backend
- [ ] Set environment variables:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `JWT_SECRET` (generate: `openssl rand -base64 32`)
  - [ ] `OPENAI_API_KEY`
- [ ] Deploy
- [ ] Test backend:
  ```bash
  curl https://<your-backend>.vercel.app/api/health
  # Should return: {"ok":true}
  ```

### Frontend Deployment
- [ ] Create new Vercel project for frontend
- [ ] Set environment variable:
  - [ ] `VITE_API_URL=https://<your-backend>.vercel.app`
- [ ] Deploy
- [ ] Test frontend: Visit https://<your-frontend>.vercel.app

---

## Post-Deployment Verification

- [ ] Load frontend URL in browser
- [ ] Register test account
- [ ] Login works
- [ ] Create new project
- [ ] Send message (if LLM configured)
- [ ] Check client console for errors
- [ ] Check Vercel logs:
  ```bash
  vercel logs https://<backend-url> --tail
  ```

---

## Production Readiness

- [ ] JWT_SECRET is strong (not a default value)
- [ ] OpenAI/LLM API key is set and valid
- [ ] Database backups are enabled in Supabase
- [ ] CORS is properly configured
- [ ] Error monitoring enabled (optional): Sentry, LogRocket, etc.
- [ ] Performance monitoring (optional): Vercel Analytics

---

## Custom Domain (Optional)

- [ ] Purchase domain or use existing domain
- [ ] Add domain to Vercel project
- [ ] Configure DNS records (follow Vercel instructions)
- [ ] Wait for DNS propagation (~24 hours)
- [ ] Update `VITE_API_URL` to custom domain if separate

---

## Monitoring & Maintenance

### Weekly
- [ ] Check Vercel logs for errors
- [ ] Monitor Supabase performance metrics

### Monthly
- [ ] Review Supabase database size
- [ ] Check Vercel usage/costs
- [ ] Backup critical data (if needed)

### As Needed
- [ ] Update dependencies: `npm outdated`
- [ ] Run security audit: `npm audit`
- [ ] Test backup/restore procedures

---

## Rollback Plan

If deployment goes wrong:

1. **Check Vercel Logs**
   ```bash
   vercel logs <url> --tail --since 30m
   ```

2. **Common Issues:**
   - Missing env variables: Add to Vercel Settings
   - Invalid credentials: Verify Supabase keys
   - SQL errors: Check Supabase dashboard for table creation

3. **Revert to Previous**
   ```bash
   git revert HEAD  # Revert last commit
   git push origin main  # Vercel auto-redeploys
   ```

4. **Verify Recovery**
   - Test backend health endpoint
   - Test frontend loads
   - Test authentication flow

---

## Troubleshooting Quick Links

See **DEPLOYMENT.md** for detailed troubleshooting guide with:
- Backend API testing
- Environment variable configuration  
- Supabase database issues
- Vercel-specific problems
- Performance optimization tips

---

## Important Security Notes

🔒 **Never commit:**
- `.env` files
- API keys
- Passwords
- Secrets

🔐 **Always:**
- Use Strong JWT_SECRET (32+ chars)
- Keep credentials in Vercel, not code
- Rotate keys periodically
- Use HTTPS only (Vercel provides this)
- Enable 2FA on GitHub, Vercel, Supabase

---

## Support

- Check DEPLOYMENT.md for full guide
- Review Vercel logs: `vercel logs <url>`
- Supabase Support: support.supabase.com
- GitHub Issues in this repo
