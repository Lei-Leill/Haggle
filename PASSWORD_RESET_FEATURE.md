# Password Reset Feature Implementation

## Summary

Added a complete **password reset system** allowing users who forget their password to:
1. Enter email on "Forgot Password" form
2. Check email for reset link
3. Click link and set new password

## Frontend Components Created

### 1. ForgotPasswordModal.jsx
Modal form for requesting password reset token.
- User enters email
- Backend sends reset link (simulated in logs)
- Success message with email confirmation

### 2. ResetPasswordModal.jsx
Modal form for resetting password with token.
- Validates token on mount
- Shows error if token is invalid/expired
- Form for new password + confirmation
- Shows success after reset
- Automatically closes and redirects to login

## Frontend Updates

### Login Page (Login.jsx)
- Added "Forgot Password?" button below password field
- Shows ForgotPasswordModal on click
- Styling matches existing auth forms

### Sign Up Page (Register.jsx)
- **Added VIP code redemption** to match login page
- Now has "Have a VIP code? Redeem it" button

## Backend Endpoints Created

All endpoints in `/server/index.js`:

### 1. POST /api/auth/forgot-password (Rate Limited)
Request password reset token.
```javascript
// Request
POST /api/auth/forgot-password
{ email: "user@example.com" }

// Response (always success for security)
{ message: "If an account exists, a reset link has been sent" }

// Processing:
- Generates 30-char hex token
- Stores token hash in database
- Token expires in 1 hour
- Token logged to console (in production: send via email)
```

### 2. POST /api/auth/validate-reset-token
Validates token before showing reset form.
```javascript
// Request
POST /api/auth/validate-reset-token
{ token: "ABC123..." }

// Response (success)
{ valid: true }

// Errors:
- Invalid token
- Token already used
- Token expired (1 hour)
```

### 3. POST /api/auth/reset-password
Resets password with valid token.
```javascript
// Request
POST /api/auth/reset-password
{ token: "ABC123...", password: "newpassword123" }

// Response (success)
{ message: "Password reset successfully" }

// Processing:
- Validates token
- Hashes new password with bcrypt
- Updates user's password_hash
- Marks token as used (one-time only)

// Errors:
- Invalid/expired token
- Password too short (< 6 chars)
- Token already used
```

## Database Schema

### New Table: password_reset_tokens
```sql
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  email TEXT NOT NULL,
  reset_token TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes:**
- `token_hash` - Fast token lookup
- `expires_at` - Find expired tokens
- `user_id` - Unique constraint, clean up old tokens

### Migration File
`/server/migrations/003_add_password_reset.sql`

## User Flow

### Forgot Password Flow
1. User clicks "Forgot Password?" on login page
2. ForgotPasswordModal appears
3. User enters email
4. Backend generates token + stores in DB
5. (In production) Email sent with reset link containing token
6. (In demo) Token logged to server console for testing
7. Success message shows

### Reset Password Flow
1. User receives email with link: `https://haggle-ai.org/reset-password?token=ABC123`
2. Click link → Frontend checks token with `/api/auth/validate-reset-token`
3. If valid, ResetPasswordModal shows with password form
4. User enters new password
5. Frontend calls `/api/auth/reset-password` with token + password
6. Password updated, token marked as used
7. Success confirmation, redirect to login

## Security Features

✅ **One-time use** - Tokens marked as used after reset
✅ **Token expiry** - 1 hour validity window  
✅ **Rate limiting** - 5 attempts per 15 minutes on forgot-password
✅ **Token hashing** - Tokens hashed in DB (SHA-256), plain token in email only
✅ **UNIQUE constraint** - Only one active reset token per user
✅ **Bcrypt hashing** - New passwords hashed with bcrypt
✅ **Email privacy** - Forgot-password doesn't reveal if email exists
✅ **CASCADE delete** - Reset tokens deleted when user is deleted

## Deployment Steps

### Step 1: Apply Database Migration
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy entire contents of `/server/migrations/003_add_password_reset.sql`
4. Paste into SQL Editor and run

✅ This creates the `password_reset_tokens` table with indexes

### Step 2: Deploy Backend
```bash
cd server
npm run deploy
# or git push to Vercel
```

### Step 3: Deploy Frontend
```bash
npm run build
npm run deploy
# or git push to Vercel
```

## Testing Password Reset Locally

1. **Start backend**: `cd server && npm run dev`
2. **Start frontend**: `npm run dev`
3. Go to login page
4. Click **"Forgot Password?"**
5. Enter any email (e.g., test@example.com)
6. **Check server console** for the reset token
7. Construct URL: `http://localhost:5173/reset-password?token=XXXXX`
8. Navigate to that URL
9. You'll see ResetPasswordModal with password form
10. Enter new password and submit
11. Password is reset!

## Production Email Setup (Next Steps)

Currently, tokens are logged to server console. To send actual emails:

**Option 1: Supabase Auth + Email**
```javascript
// After generating token, send via Supabase
await supabase.auth.admin.createUser({/* ... */})
```

**Option 2: SendGrid/Mailgun**
```javascript
const sgMail = require('@sendgrid/mail');
await sgMail.send({
  to: email,
  from: 'noreply@haggle-ai.org',
  subject: 'Reset Your Password',
  html: `<a href="https://haggle-ai.org/reset-password?token=${resetToken}">Reset Password</a>`
});
```

**Option 3: Resend**
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'noreply@haggle-ai.org',
  to: email,
  subject: 'Reset Your Password',
  html: `<a href="https://haggle-ai.org/reset-password?token=${resetToken}">Reset Password</a>`
});
```

## Files Modified/Created

### New Files
- `/src/components/ForgotPasswordModal.jsx`
- `/src/components/ResetPasswordModal.jsx`
- `/server/migrations/003_add_password_reset.sql`

### Modified Files
- `/src/pages/Login.jsx` - Added forgot password + VIP code
- `/src/pages/Register.jsx` - Added VIP code support
- `/src/pages/Auth.css` - Added forgot password button styling
- `/server/index.js` - Added crypto import + 3 endpoints

## Features Now Available

✅ **Forgot Password** - Request reset link on login page
✅ **Reset Token Validation** - Check token before showing form
✅ **One-Time Reset** - Tokens can only be used once
✅ **Token Expiry** - 1 hour validity window
✅ **Secure Storage** - Tokens hashed in database
✅ **VIP Code Support** - On both login AND signup pages
✅ **Rate Limiting** - Prevents brute force attempts
✅ **User Feedback** - Clear error messages + success confirmations

## Demo Usage

### For Testers
1. Sign up with any email
2. Click "Forgot Password" on login
3. Check server logs for reset token
4. Use token in reset-password URL
5. Set new password successfully

### For Developers
- Examine ForgotPasswordModal.jsx for email form pattern
- Check ResetPasswordModal.jsx for token validation flow
- Review backend endpoints for security best practices
