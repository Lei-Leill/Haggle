# Code Changes for Deployment

## Summary of Modifications

This document outlines all code changes made to prepare Haggle for deployment with Vercel + Supabase.

---

## 1. Backend Database Layer (`server/db.js`)

### Change: Migrated from SQLite to Supabase PostgreSQL

**What Changed:**
- Replaced `better-sqlite3` with Supabase SDK (`@supabase/supabase-js`)
- Converted database from local file-based (`haggle.db`) to cloud PostgreSQL
- Database operations are now async

**Key Points:**
- The database abstraction layer automatically parses SQL queries and converts them to Supabase RLS calls
- ALL database operations (`get()`, `all()`, `run()`) now return Promises and must be awaited
- Supports common query patterns used in the app

**Limitations:**
- Complex or non-standard SQL queries may need manual updates to `server/db.js`
- PRAGMA queries (used to check table schema) are not supported - use Supabase dashboard instead
- Datetime functions: SQLite's `datetime('now')` is converted to JavaScript's `Date().toISOString()`

**When to Update:**
If you add new database queries patterns, you may need to update the query parser in `server/db.js` to handle them.

---

## 2. Backend Dependencies (`server/package.json`)

### Changes:
```diff
- "better-sqlite3": "^11.6.0"
+ "@supabase/supabase-js": "^2.38.0"
```

**What to Do:**
```bash
cd server
npm install
```

---

## 3. Backend Environment Variables (`server/.env.example`)

### Added Supabase Configuration:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**Local Setup:**
```bash
cp server/.env.example server/.env.local
# Edit .env.local with your Supabase credentials
```

**Vercel Setup:**
Add these as environment variables in Vercel dashboard.

---

## 4. Frontend API Configuration (`src/api.js`)

### Minor Update:
- Simplified `API_BASE` configuration
- Now defaults to empty string (uses same origin)
- Supports `VITE_API_URL` environment variable for custom API endpoints

**For Deployment:**
Set `VITE_API_URL=https://your-backend.vercel.app` in Vercel environment variables.

---

## 5. Frontend Environment (`root/.env.example`)

### New File:
Created for frontend environment variables:
```env
VITE_API_URL=
# For development: leave empty (Vite proxy)
# For production: set to backend API URL
```

---

## 6. Deployment Configuration (`vercel.json`)

### New File:
Vercel's configuration for monorepo setup:
- Builds React frontend and Node.js backend
- Routes `/api/*` to backend serverless functions
- Routes everything else to React frontend

**Key Configuration:**
- Frontend build output: `dist/`
- Backend entry: `server/index.js`
- Environment variables mapped to Vercel secrets

---

## 7. Database Migration Guide (`DEPLOYMENT.md` and SQL)

### New File:
Complete deployment guide including SQL migrations to create:
- `users` table (PostgreSQL version)
- `chats` table
- `messages` table
- `project_metadata` table
- Indexes for performance

**Import Note:**
BigSerial (PostgreSQL) vs INTEGER (SQLite) for primary keys
- PostgreSQL: `BIGSERIAL` (auto-incrementing 64-bit)
- No functional difference for application logic

---

## 8. Deployment Checklist (`DEPLOYMENT_CHECKLIST.md`)

### New File:
Quick reference for:
- Pre-deployment testing
- Supabase setup steps
- Vercel deployment steps
- Post-deployment verification
- Monitoring and maintenance
- Troubleshooting guide

---

## Files NOT Modified (But important to know)

### `server/index.js`
- No changes needed! (Database queries return Promises now, but await is automatic)
- All route handlers work with async database calls
- NOTE: If you see errors about promises, ensure database calls are awaited

### `server/auth.js`
- No changes needed
- JWT functionality remains the same

### Vite Configuration (`vite.config.js`)
- No changes - already configured with proxy to backend
- In production: frontend and backend are on same origin

---

## Migration Path for Existing Data

If you have existing data in the local SQLite database:

1. **Export from SQLite:**
   ```bash
   sqlite3 server/haggle.db ".dump users" > users.sql
   sqlite3 server/haggle.db ".dump chats" > chats.sql
   sqlite3 server/haggle.db ".dump messages" > messages.sql
   sqlite3 server/haggle.db ".dump project_metadata" > metadata.sql
   ```

2. **Convert and Import to Supabase:**
   - SQL dump format needs slight adjustments for PostgreSQL
   - Use Supabase SQL editor to import

3. **Or Re-create Data:**
   - Fresh start with cloud database
   - Users sign up again on production
   - Recommended for first deployment

---

## Testing the Changes Locally

### 1. Set Up Local Supabase (Optional)
Use Supabase local development:
```bash
npm install -g supabase
supabase start
```

### 2. Or Use Remote Supabase
Use your cloud Supabase project:
```bash
cp server/.env.example server/.env.local
# Edit with real Supabase credentials
```

### 3. Start Server
```bash
cd server
npm install
npm run dev
```

### 4. Start Frontend
```bash
# new terminal
npm install
npm run dev
```

### 5. Test API
```bash
curl http://localhost:3001/api/health
# Should return: {"ok":true}
```

---

## Known Limitations & Future Improvements

### Current Limitations
1. Database query parser handles common patterns but may not support all SQL
2. Datetime handling differs between SQLite and PostgreSQL
3. Binary data (if any) needs special handling
4. No offline support (requires internet for Supabase)

### Potential Improvements
1. Add proper ORM (e.g., Prisma) instead of SQL strings
2. Add database connection pooling for production
3. Implement query caching layer
4. Add database backup automation
5. Add monitoring/alerting for database performance

---

## Reverting to SQLite (If Needed)

If you need to go back to SQLite:

1. **Revert database layer:**
   ```bash
   git revert <commit-hash>
   ```

2. **Reinstall SQLite:**
   ```bash
   cd server
   npm install better-sqlite3
   npm uninstall @supabase/supabase-js
   ```

3. **Update environment:**
   - Remove Supabase variables
   - Database file will auto-recreate

---

## Getting Help

- **Database errors:** Check `server/db.js` query parser
- **Deployment issues:** See `DEPLOYMENT.md`
- **API errors:** Check Vercel logs: `vercel logs <url> --tail`
- **Supabase issues:** Supabase dashboard → Logs section
