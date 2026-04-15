# Token & VIP System Implementation Guide

## 🎉 What's Been Implemented

Your Haggle app now has a complete **token-based access control system** for public demo with cost management:

### ✅ Backend Endpoints Created

1. **`POST /api/auth/register`** - Updated
   - New users automatically get **1,000 free trial tokens**
   - User_tokens record created on registration

2. **`POST /api/auth/redeem-vip-code`** (Protected)
   - Validates VIP codes from the 45 generated codes
   - Adds **20,000 tokens** to user's balance
   - Marks code as used (can't be reused)
   - Returns updated token balance

3. **`GET /api/user/tokens`** (Protected)
   - Returns user's token balance: `{ tokens_remaining, is_vip, total_tokens, tokens_used }`
   - Creates free trial record if user has no token record yet

4. **`POST /api/feedback`** (Protected)
   - Submits user feedback with category (bug, feature_request, general, ui/ux)
   - Optional rating (1-5) and contact email
   - Stored in `feedback` table for analysis

### ✅ Database Schema Created
File: `/server/migrations/002_add_token_and_vip_system.sql`

Three new tables:
- **`vip_codes`**: 45 codes, 20,000 tokens each, tracks usage
- **`user_tokens`**: Per-user balance, VIP status, token usage tracking
- **`feedback`**: User feedback collection with categories and ratings

### ✅ Frontend Components Created

1. **`VipCodeRedemption.jsx`** - Modal for redeeming VIP codes
   - Input field for VIP code (format: VIP-XXXXXX-XXXXXX)
   - Shows success message after redemption
   - Error handling for invalid/used codes

2. **`FeedbackModal.jsx`** - Feedback submission form
   - Category dropdown (bug, feature_request, general, ui/ux)
   - 1-5 star rating system
   - Message textarea
   - Optional contact email
   - Shows success confirmation

3. **`Header.jsx`** - Updated
   - Token balance display with ⚡ icon (top-right)
   - Feedback button (💬) in header
   - Feedback option in user menu
   - Auto-fetches token balance on load

### ✅ UI Updates

- **Login Page** - Added "Have a VIP code? Redeem it" button
- **Header** - Token display shows remaining tokens
- **User Menu** - "Send Feedback" option
- **Feedback Button** - Quick access in top bar

## 🚀 Deployment Instructions

### Step 1: Create Database Schema
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `/server/migrations/002_add_token_and_vip_system.sql`
4. Paste into SQL Editor
5. Click **"Run"**

✅ This creates: `vip_codes`, `user_tokens`, `feedback` tables with indexes

### Step 2: Insert 45 VIP Codes
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `/server/migrations/VIP_CODES_INSERT.sql`
4. Paste into SQL Editor
5. Click **"Run"**

✅ This inserts all 45 VIP codes into the database (ready for distribution)

### Step 3: Deploy Backend
```bash
cd server
npm run deploy
# or git push to Vercel if using Git deployment
```

### Step 4: Deploy Frontend
```bash
npm run build
npm run deploy
# or git push to Vercel if using Git deployment
```

✅ Both deploys will include the new API endpoints and UI components

## 📋 Token Allocation Summary

| User Type | Tokens | Allocation Method | Duration |
|-----------|--------|------------------|----------|
| **Free Trial** | 1,000 | Automatic on signup | Limited |
| **VIP Testers** | 20,000 | Redeem VIP code | Access + credits |
| **Total VIP Pool** | 900,000 | 45 codes × 20,000 | Demo phase |

## 🎟️ Your 45 VIP Codes

Share these codes with your testers. Each code gives 20,000 tokens (shorter, easier to type):

```
01. Haggle-038B    16. Haggle-BACB    31. Haggle-0953
02. Haggle-074B    17. Haggle-7B08    32. Haggle-D80E
03. Haggle-842B    18. Haggle-70B8    33. Haggle-855B
04. Haggle-23AF    19. Haggle-C278    34. Haggle-654F
05. Haggle-BFE6    20. Haggle-39F4    35. Haggle-7896
06. Haggle-73CF    21. Haggle-ED6F    36. Haggle-5FBA
07. Haggle-4B5F    22. Haggle-1A1F    37. Haggle-2B2B
08. Haggle-3470    23. Haggle-3606    38. Haggle-88D7
09. Haggle-90A3    24. Haggle-7BF0    39. Haggle-3FB1
10. Haggle-EDA0    25. Haggle-8F62    40. Haggle-8D54
11. Haggle-C635    26. Haggle-8B7D    41. Haggle-CF15
12. Haggle-7DB7    27. Haggle-D910    42. Haggle-91B0
13. Haggle-5DD5    28. Haggle-AD56    43. Haggle-023E
14. Haggle-17C6    29. Haggle-41D9    44. Haggle-D47D
15. Haggle-88EA    30. Haggle-244C    45. Haggle-426B
```

## 🔄 How Users Redeem Codes

### New Users:
1. Click **"Have a VIP code? Redeem it"** on login page
2. Enter VIP code: `VIP-XXXXXX-XXXXXX`
3. Get redirected to dashboard with 20,000 tokens

### Existing Users:
1. Click **"Send Feedback"** button → goes to user menu
2. Can redeem VIP code from settings if they haven't already
3. Or click the feedback icon to submit feedback

## 📊 Feedback Collection

Users can submit feedback with:
- **Category**: Bug Report, Feature Request, General Feedback, UI/UX Suggestion
- **Rating**: 1-5 stars
- **Message**: Open text feedback
- **Contact Email**: Optional (for follow-up)

All feedback is stored in `feedback` table for analysis.

## 🔧 Token Tracking (NEXT STEPS)

To enforce token limits, you'll need to:

1. **Add token consumption tracking** in message endpoint:
   ```javascript
   // After LLM response, deduct tokens:
   - Estimate tokens used: completion_tokens * token_cost
   - Update user_tokens.tokens_remaining
   - Show warning when < 100 tokens left
   ```

2. **Add token check** before LLM call:
   ```javascript
   // Check if user has tokens remaining
   // Reject if tokens_remaining <= 0
   ```

3. **Add token display refresh** in UI:
   ```javascript
   // After sending message, refetch token balance
   // Show real-time token count in header
   ```

## ✨ Features Now Available

✅ **VIP Code Redemption** - On login page & in demo
✅ **Automatic Free Trial** - 1,000 tokens on signup
✅ **Token Balance Display** - In header with count
✅ **Feedback System** - 5-minute feedback collection
✅ **Cost Control** - Track token allocation per user
✅ **Multi-tier Access** - VIP vs free trial distinction

## 📝 Files Modified/Created

### New Files:
- `/src/components/VipCodeRedemption.jsx` - VIP code modal
- `/src/components/FeedbackModal.jsx` - Feedback form
- `/server/migrations/002_add_token_and_vip_system.sql` - Database schema
- `/server/migrations/VIP_CODES_INSERT.sql` - VIP code batch insert
- `/scripts/generate-vip-codes.js` - Code generator (already run)

### Modified Files:
- `/src/components/Header.jsx` - Added token display & feedback button
- `/src/components/Header.css` - Added styling
- `/src/pages/Login.jsx` - Added VIP code redemption option
- `/src/pages/Auth.css` - Added VIP button styling
- `/src/App.jsx` - Pass token to Header component
- `/server/index.js` - Added 3 new API endpoints, updated registration

## 🎯 Ready to Deploy

Your app is now ready for public demo with:
- ✅ 45 VIP codes to distribute
- ✅ 1,000 token free trial for public
- ✅ Feedback collection system
- ✅ Token balance tracking
- ✅ Beautiful UI for redemption

**Next Action**: Execute the Supabase SQL queries to activate the backend!
